import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import {
  ApplicationError,
  ErrorCode,
  type ServiceResult,
} from "./types/error-types";
import { convertImage, type ImageConversionOptions } from "./image-conversion";
import { IMAGE_COMPRESSION_CONFIG } from "./image-compression-config";

export interface ImageMetadata {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
  format: string;
  uploadedAt: string;
}

export interface ImageUploadResult {
  url: string;
  metadata: ImageMetadata;
}

function createS3Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new ApplicationError(
      ErrorCode.CONFIGURATION_ERROR,
      "Missing required R2 configuration (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
      "ImageService",
      "createS3Client",
      {
        hasEndpoint: !!endpoint,
        hasAccessKey: !!accessKeyId,
        hasSecretKey: !!secretAccessKey,
      },
    );
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Service for managing recipe image operations via Cloudflare R2
 * Handles image upload, compression, storage, and cleanup with enterprise-level error handling
 */
export class ImageService {
  private s3: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor() {
    this.s3 = createS3Client();
    this.bucketName = process.env.R2_BUCKET_NAME || "meal-maestro-images";
    this.publicUrl = process.env.R2_PUBLIC_URL || "";

    if (!this.publicUrl) {
      throw new ApplicationError(
        ErrorCode.CONFIGURATION_ERROR,
        "Missing required R2_PUBLIC_URL configuration",
        "ImageService",
        "constructor",
        {},
      );
    }
  }

  /**
   * Upload and process a recipe image with automatic compression and cache invalidation
   */
  async uploadRecipeImage(
    recipeId: string,
    userId: string,
    imageBuffer: Buffer,
    options: Partial<ImageConversionOptions> = {},
  ): Promise<ServiceResult<ImageUploadResult>> {
    try {
      if (!recipeId || !userId || !imageBuffer || imageBuffer.length === 0) {
        throw new ApplicationError(
          ErrorCode.INVALID_INPUT,
          "Missing required parameters for image upload",
          "ImageService",
          "uploadRecipeImage",
          { recipeId, userId, bufferSize: imageBuffer.length },
        );
      }

      if (imageBuffer.length > IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES) {
        throw new ApplicationError(
          ErrorCode.VALIDATION_ERROR,
          IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE,
          "ImageService",
          "uploadRecipeImage",
          {
            fileSize: imageBuffer.length,
            maxSize: IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES,
          },
        );
      }

      const conversionOptions: ImageConversionOptions = {
        format: "webp",
        quality: 85,
        width: IMAGE_COMPRESSION_CONFIG.MAX_WIDTH,
        height: IMAGE_COMPRESSION_CONFIG.MAX_HEIGHT,
        ...options,
      };

      const conversionResult = await convertImage(
        imageBuffer,
        conversionOptions,
      );

      const timestamp = Date.now();
      const filename = `${timestamp}.webp`;
      const key = `${userId}/${recipeId}/${filename}`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: conversionResult.buffer,
          ContentType: "image/webp",
          CacheControl: "public, max-age=3600",
        }),
      );

      const publicUrl = `${this.publicUrl}/${key}`;

      const metadata: ImageMetadata = {
        originalSize: conversionResult.originalSize,
        compressedSize: conversionResult.metadata.size,
        compressionRatio: conversionResult.compressionRatio,
        dimensions: {
          width: conversionResult.metadata.width,
          height: conversionResult.metadata.height,
        },
        format: conversionResult.metadata.format,
        uploadedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: {
          url: publicUrl,
          metadata,
        },
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        return { success: false, error };
      }

      return {
        success: false,
        error: new ApplicationError(
          ErrorCode.INTERNAL_ERROR,
          "Unexpected error during image upload",
          "ImageService",
          "uploadRecipeImage",
          { originalError: error },
        ),
      };
    }
  }

  /**
   * Delete a recipe image from storage
   */
  async deleteRecipeImage(
    imageUrl: string,
    userId: string,
  ): Promise<ServiceResult<void>> {
    try {
      if (!imageUrl || !userId) {
        throw new ApplicationError(
          ErrorCode.INVALID_INPUT,
          "Missing required parameters for image deletion",
          "ImageService",
          "deleteRecipeImage",
          { imageUrl, userId },
        );
      }

      const filePath = this.extractFilePathFromUrl(imageUrl);
      if (!filePath) {
        throw new ApplicationError(
          ErrorCode.INVALID_INPUT,
          "Invalid image URL format",
          "ImageService",
          "deleteRecipeImage",
          { imageUrl },
        );
      }

      if (!filePath.startsWith(`${userId}/`)) {
        throw new ApplicationError(
          ErrorCode.AUTHORIZATION_ERROR,
          "User not authorized to delete this image",
          "ImageService",
          "deleteRecipeImage",
          { userId, filePath },
        );
      }

      try {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: filePath,
          }),
        );
      } catch (deleteError) {
        // Log but don't fail - orphaned files will be cleaned up by background job
        console.warn("Failed to delete image from storage:", deleteError);
      }

      return { success: true, data: undefined };
    } catch (error) {
      if (error instanceof ApplicationError) {
        return { success: false, error };
      }

      return {
        success: false,
        error: new ApplicationError(
          ErrorCode.INTERNAL_ERROR,
          "Unexpected error during image deletion",
          "ImageService",
          "deleteRecipeImage",
          { originalError: error },
        ),
      };
    }
  }

  /**
   * Clean up old image when replacing with new one
   */
  async replaceRecipeImage(
    recipeId: string,
    userId: string,
    imageBuffer: Buffer,
    oldImageUrl?: string,
    options: Partial<ImageConversionOptions> = {},
  ): Promise<ServiceResult<ImageUploadResult>> {
    try {
      const uploadResult = await this.uploadRecipeImage(
        recipeId,
        userId,
        imageBuffer,
        options,
      );

      if (!uploadResult.success) {
        return uploadResult;
      }

      // Clean up old image if it exists (best effort - don't fail if cleanup fails)
      if (oldImageUrl) {
        await this.deleteRecipeImage(oldImageUrl, userId);
      }

      return uploadResult;
    } catch (error) {
      return {
        success: false,
        error: new ApplicationError(
          ErrorCode.INTERNAL_ERROR,
          "Unexpected error during image replacement",
          "ImageService",
          "replaceRecipeImage",
          { originalError: error },
        ),
      };
    }
  }

  /**
   * Re-key an image URL from an old user ID to a new user ID.
   * Copies the R2 object to the new key, deletes the old one, and returns the new URL.
   * Returns null if the URL doesn't need re-keying (already correct or not an R2 URL).
   */
  async rekeyImageForUser(
    imageUrl: string,
    oldUserId: string,
    newUserId: string,
  ): Promise<string | null> {
    const filePath = this.extractFilePathFromUrl(imageUrl);
    if (!filePath || !filePath.startsWith(`${oldUserId}/`)) {
      return null;
    }

    const restOfPath = filePath.substring(oldUserId.length + 1);
    const newKey = `${newUserId}/${restOfPath}`;

    // Copy to new key
    await this.s3.send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${filePath}`,
        Key: newKey,
      }),
    );

    // Verify the copy
    await this.s3.send(
      new HeadObjectCommand({ Bucket: this.bucketName, Key: newKey }),
    );

    // Delete old key
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: filePath }),
    );

    return `${this.publicUrl}/${newKey}`;
  }

  /**
   * Extract file path (S3 key) from an R2 image URL.
   */
  private extractFilePathFromUrl(url: string): string | null {
    try {
      if (this.publicUrl && url.startsWith(this.publicUrl)) {
        const path = url.slice(this.publicUrl.length);
        return path.startsWith("/") ? path.slice(1) : path;
      }

      return null;
    } catch {
      return null;
    }
  }
}
