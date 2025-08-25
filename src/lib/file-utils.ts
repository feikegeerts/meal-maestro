/**
 * Shared file utilities for consistent file operations across the application
 */

import { IMAGE_COMPRESSION_CONFIG, type SupportedImageFormat } from './image-compression-config';

/**
 * Formats a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculates file size savings between original and compressed versions
 */
export function calculateSavings(originalSize: number, newSize: number): {
  savedBytes: number;
  savedPercentage: number;
  formattedSaving: string;
} {
  const savedBytes = originalSize - newSize;
  const savedPercentage = (savedBytes / originalSize) * 100;
  
  return {
    savedBytes,
    savedPercentage,
    formattedSaving: `${formatFileSize(savedBytes)} (${savedPercentage.toFixed(1)}%)`
  };
}

/**
 * Validates if a file is a supported image format
 */
export function isValidImageFormat(file: File): boolean {
  return IMAGE_COMPRESSION_CONFIG.SUPPORTED_FORMATS.includes(file.type as SupportedImageFormat);
}

/**
 * Validates if a file size is within allowed limits
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES;
}

/**
 * Gets the appropriate MIME type prefix for base64 data URL
 */
export function getMimeTypePrefix(format: string): string {
  switch (format) {
    case 'webp':
      return 'data:image/webp;base64,';
    case 'jpeg':
      return 'data:image/jpeg;base64,';
    case 'png':
      return 'data:image/png;base64,';
    default:
      return 'data:image/jpeg;base64,';
  }
}

/**
 * Calculates the actual file size from a base64 data URL
 * Accounts for padding and header overhead
 */
export function calculateBase64Size(dataUrl: string): number {
  // Find the base64 data portion (after the comma)
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) return 0;
  
  // Calculate size accounting for padding
  const padding = (base64Data.match(/=/g) || []).length;
  return Math.round((base64Data.length * 3/4) - padding);
}

/**
 * Comprehensive file validation with detailed error messages
 */
export function validateImageFile(file: File): { 
  isValid: boolean; 
  error?: string; 
} {
  if (!isValidImageFormat(file)) {
    return {
      isValid: false,
      error: IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.UNSUPPORTED_FORMAT
    };
  }
  
  if (!isValidFileSize(file)) {
    return {
      isValid: false,
      error: IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE
    };
  }
  
  return { isValid: true };
}