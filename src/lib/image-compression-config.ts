/**
 * Configuration constants for image compression
 * Centralized settings to ensure consistency across the application
 */

export const IMAGE_COMPRESSION_CONFIG = {
  // File size limits
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024, // 20MB - maximum allowed upload size
  TARGET_SIZE_KB: 1200, // 1.2MB - target compressed size for optimal API performance
  
  // Image dimensions
  MAX_WIDTH: 2048, // Maximum width in pixels for recipe readability
  MAX_HEIGHT: 2048, // Maximum height in pixels for recipe readability
  
  // Compression quality settings
  DEFAULT_QUALITY: 0.90, // 90% - starting quality for compression
  MIN_QUALITY: 0.50, // 50% - minimum quality threshold
  QUALITY_STEP: 0.20, // 20% - quality reduction per iteration
  
  // Supported formats
  SUPPORTED_FORMATS: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ] as const,
  
  // Output format preferences
  PREFERRED_OUTPUT_FORMAT: 'image/webp' as const,
  FALLBACK_OUTPUT_FORMAT: 'image/jpeg' as const,
  
  // Error messages
  ERROR_MESSAGES: {
    FILE_TOO_LARGE: 'Image file must be smaller than 20MB',
    UNSUPPORTED_FORMAT: 'Unsupported image format. Please use JPEG, PNG, WebP, or GIF.',
    COMPRESSION_FAILED: 'Failed to compress image. Please try a different image.',
    CANVAS_NOT_SUPPORTED: 'Image compression is not supported in this browser.',
    LOAD_FAILED: 'Failed to load image file.'
  }
} as const;

export type SupportedImageFormat = typeof IMAGE_COMPRESSION_CONFIG.SUPPORTED_FORMATS[number];