import { IMAGE_COMPRESSION_CONFIG } from './image-compression-config';
import { calculateBase64Size } from './file-utils';

export interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  targetSizeKB?: number;
}

export interface CompressionResult {
  compressedDataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  originalDimensions: { width: number; height: number };
  compressedDimensions: { width: number; height: number };
  format: string;
}

// Re-export for backward compatibility
export { formatFileSize } from './file-utils';

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    quality = IMAGE_COMPRESSION_CONFIG.DEFAULT_QUALITY,
    maxWidth = IMAGE_COMPRESSION_CONFIG.MAX_WIDTH,
    maxHeight = IMAGE_COMPRESSION_CONFIG.MAX_HEIGHT,
    targetSizeKB = IMAGE_COMPRESSION_CONFIG.TARGET_SIZE_KB
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error(IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.CANVAS_NOT_SUPPORTED));
      return;
    }

    img.onload = () => {
      const originalWidth = img.width;
      const originalHeight = img.height;
      const originalSize = file.size;

      // Calculate new dimensions while maintaining aspect ratio
      const { width: newWidth, height: newHeight } = calculateNewDimensions(
        originalWidth,
        originalHeight,
        maxWidth,
        maxHeight
      );

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Iteratively compress until target size is reached
      let currentQuality = quality;
      let bestResult: CompressionResult | null = null;
      let format = 'webp';

      // Try compression with different qualities
      while (currentQuality >= IMAGE_COMPRESSION_CONFIG.MIN_QUALITY) {
        // Draw and compress the image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Try WebP first, fallback to JPEG if not supported
        let compressedDataUrl: string;
        try {
          compressedDataUrl = canvas.toDataURL(IMAGE_COMPRESSION_CONFIG.PREFERRED_OUTPUT_FORMAT, currentQuality);
          // Check if WebP is actually supported
          if (!compressedDataUrl.startsWith('data:image/webp')) {
            throw new Error('WebP not supported');
          }
          format = 'webp';
        } catch {
          // Fallback to JPEG
          compressedDataUrl = canvas.toDataURL(IMAGE_COMPRESSION_CONFIG.FALLBACK_OUTPUT_FORMAT, currentQuality);
          format = 'jpeg';
        }

        // Calculate compressed size using proper base64 calculation
        const compressedSize = calculateBase64Size(compressedDataUrl);
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

        const result: CompressionResult = {
          compressedDataUrl,
          originalSize,
          compressedSize,
          compressionRatio,
          originalDimensions: { width: originalWidth, height: originalHeight },
          compressedDimensions: { width: newWidth, height: newHeight },
          format
        };

        // Store the best result so far
        bestResult = result;

        // If we've reached the target size, we're done
        if (compressedSize <= targetSizeKB * 1024) {
          break;
        }

        // Reduce quality for next iteration
        currentQuality -= IMAGE_COMPRESSION_CONFIG.QUALITY_STEP;
      }

      if (bestResult) {
        resolve(bestResult);
      } else {
        reject(new Error(IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.COMPRESSION_FAILED));
      }
    };

    img.onerror = () => {
      reject(new Error(IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.LOAD_FAILED));
    };

    // Convert file to data URL for loading into image
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error(IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.LOAD_FAILED));
    };
    reader.readAsDataURL(file);
  });
}

function calculateNewDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Calculate scaling factor
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const scale = Math.min(widthRatio, heightRatio, 1); // Don't upscale

  width = Math.round(originalWidth * scale);
  height = Math.round(originalHeight * scale);

  return { width, height };
}

export async function compressMultipleImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> {
  const results = await Promise.all(
    files.map(file => compressImage(file, options))
  );
  return results;
}