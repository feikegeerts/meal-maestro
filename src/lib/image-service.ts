import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApplicationError, ErrorCode, type ServiceResult } from './types/error-types';
import { convertImage, type ImageConversionOptions } from './image-conversion';
import { IMAGE_COMPRESSION_CONFIG } from './image-compression-config';

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

export interface ImageServiceConfig {
  supabaseClient?: SupabaseClient;
  supabaseUrl?: string;
  supabaseKey?: string;
}

/**
 * Service for managing recipe image operations
 * Handles image upload, compression, storage, and cleanup with enterprise-level error handling
 */
export class ImageService {
  private supabase: SupabaseClient;
  private readonly bucketName = 'recipe-images';

  constructor(config?: ImageServiceConfig) {
    // Use provided authenticated client if available, otherwise create new one
    if (config?.supabaseClient) {
      this.supabase = config.supabaseClient;
    } else {
      const supabaseUrl = config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = config?.supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new ApplicationError(
          ErrorCode.CONFIGURATION_ERROR,
          'Missing required Supabase configuration',
          'ImageService',
          'constructor',
          { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey }
        );
      }

      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
  }

  /**
   * Upload and process a recipe image with automatic compression and cache invalidation
   */
  async uploadRecipeImage(
    recipeId: string,
    userId: string,
    imageBuffer: Buffer,
    options: Partial<ImageConversionOptions> = {}
  ): Promise<ServiceResult<ImageUploadResult>> {
    try {
      // Validate input parameters
      if (!recipeId || !userId || !imageBuffer || imageBuffer.length === 0) {
        throw new ApplicationError(
          ErrorCode.INVALID_INPUT,
          'Missing required parameters for image upload',
          'ImageService',
          'uploadRecipeImage',
          { recipeId, userId, bufferSize: imageBuffer.length }
        );
      }

      // Validate file size
      if (imageBuffer.length > IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES) {
        throw new ApplicationError(
          ErrorCode.VALIDATION_ERROR,
          IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE,
          'ImageService',
          'uploadRecipeImage',
          { fileSize: imageBuffer.length, maxSize: IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES }
        );
      }

      // Process image with Sharp
      const conversionOptions: ImageConversionOptions = {
        format: 'webp',
        quality: 85, // High quality for recipe photos
        width: IMAGE_COMPRESSION_CONFIG.MAX_WIDTH,
        height: IMAGE_COMPRESSION_CONFIG.MAX_HEIGHT,
        ...options
      };

      const conversionResult = await convertImage(imageBuffer, conversionOptions);

      // Strip EXIF data for privacy (Sharp does this automatically for WebP)
      
      // Generate timestamp-based filename for cache invalidation
      const timestamp = Date.now();
      const filename = `${timestamp}.webp`;
      const filePath = `${userId}/${recipeId}/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, conversionResult.buffer, {
          contentType: 'image/webp',
          cacheControl: '3600', // 1 hour cache
        });

      if (uploadError) {
        throw new ApplicationError(
          ErrorCode.EXTERNAL_API_ERROR,
          `Failed to upload image to storage: ${uploadError.message}`,
          'ImageService',
          'uploadRecipeImage',
          { uploadError, filePath }
        );
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      // Create metadata object
      const metadata: ImageMetadata = {
        originalSize: conversionResult.originalSize,
        compressedSize: conversionResult.metadata.size,
        compressionRatio: conversionResult.compressionRatio,
        dimensions: {
          width: conversionResult.metadata.width,
          height: conversionResult.metadata.height
        },
        format: conversionResult.metadata.format,
        uploadedAt: new Date().toISOString()
      };

      return {
        success: true,
        data: {
          url: publicUrl,
          metadata
        }
      };

    } catch (error) {
      if (error instanceof ApplicationError) {
        return {
          success: false,
          error: error
        };
      }

      return {
        success: false,
        error: new ApplicationError(
          ErrorCode.INTERNAL_ERROR,
          'Unexpected error during image upload',
          'ImageService',
          'uploadRecipeImage',
          { originalError: error }
        )
      };
    }
  }

  /**
   * Delete a recipe image from storage
   */
  async deleteRecipeImage(
    imageUrl: string,
    userId: string
  ): Promise<ServiceResult<void>> {
    try {
      if (!imageUrl || !userId) {
        throw new ApplicationError(
          ErrorCode.INVALID_INPUT,
          'Missing required parameters for image deletion',
          'ImageService',
          'deleteRecipeImage',
          { imageUrl, userId }
        );
      }

      // Extract file path from URL
      const filePath = this.extractFilePathFromUrl(imageUrl);
      if (!filePath) {
        throw new ApplicationError(
          ErrorCode.INVALID_INPUT,
          'Invalid image URL format',
          'ImageService',
          'deleteRecipeImage',
          { imageUrl }
        );
      }

      // Verify user owns this image path
      if (!filePath.startsWith(`${userId}/`)) {
        throw new ApplicationError(
          ErrorCode.AUTHORIZATION_ERROR,
          'User not authorized to delete this image',
          'ImageService',
          'deleteRecipeImage',
          { userId, filePath }
        );
      }

      // Delete from Supabase Storage
      const { error: deleteError } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (deleteError) {
        // Log but don't fail - orphaned files will be cleaned up by background job
        console.warn('Failed to delete image from storage:', deleteError);
      }

      return {
        success: true,
        data: undefined
      };

    } catch (error) {
      if (error instanceof ApplicationError) {
        return {
          success: false,
          error: error
        };
      }

      return {
        success: false,
        error: new ApplicationError(
          ErrorCode.INTERNAL_ERROR,
          'Unexpected error during image deletion',
          'ImageService',
          'deleteRecipeImage',
          { originalError: error }
        )
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
    options: Partial<ImageConversionOptions> = {}
  ): Promise<ServiceResult<ImageUploadResult>> {
    try {
      // Upload new image first
      const uploadResult = await this.uploadRecipeImage(recipeId, userId, imageBuffer, options);
      
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
          'Unexpected error during image replacement',
          'ImageService',
          'replaceRecipeImage',
          { originalError: error }
        )
      };
    }
  }

  /**
   * Extract file path from Supabase storage URL
   */
  private extractFilePathFromUrl(url: string): string | null {
    try {
      // Supabase storage URLs follow pattern: https://xxx.supabase.co/storage/v1/object/public/bucket/path
      const match = url.match(/\/storage\/v1\/object\/public\/recipe-images\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get storage usage statistics for monitoring
   */
  async getStorageStats(userId: string): Promise<ServiceResult<{ fileCount: number; totalSize: number }>> {
    try {
      const { data: files, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(userId, {
          limit: 1000, // Adjust based on expected usage
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        throw new ApplicationError(
          ErrorCode.EXTERNAL_API_ERROR,
          `Failed to get storage stats: ${error.message}`,
          'ImageService',
          'getStorageStats',
          { error }
        );
      }

      const stats = files?.reduce(
        (acc, file) => ({
          fileCount: acc.fileCount + 1,
          totalSize: acc.totalSize + (file.metadata?.size || 0)
        }),
        { fileCount: 0, totalSize: 0 }
      ) || { fileCount: 0, totalSize: 0 };

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      if (error instanceof ApplicationError) {
        return {
          success: false,
          error: error
        };
      }

      return {
        success: false,
        error: new ApplicationError(
          ErrorCode.INTERNAL_ERROR,
          'Unexpected error getting storage stats',
          'ImageService',
          'getStorageStats',
          { originalError: error }
        )
      };
    }
  }
}