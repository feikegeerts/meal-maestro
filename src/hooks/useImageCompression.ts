import { useState, useCallback } from 'react';
import { compressImage, type CompressionResult } from '@/lib/client-image-compression';
import { validateImageFile, formatFileSize } from '@/lib/file-utils';

export interface UseImageCompressionState {
  selectedImage: File | null;
  compressedImageData: string | null;
  compressionStats: CompressionResult | null;
  isCompressing: boolean;
  error: string | null;
}

export interface UseImageCompressionActions {
  handleImageSelect: (file: File) => Promise<void>;
  clearImage: () => void;
  clearError: () => void;
}

export function useImageCompression(): UseImageCompressionState & UseImageCompressionActions {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [compressedImageData, setCompressedImageData] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = useCallback(async (file: File) => {
    setIsCompressing(true);
    setError(null);
    
    try {
      // Validate the file first
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error!);
        setIsCompressing(false);
        return;
      }

      // Compress the image
      const compressionResult = await compressImage(file, {
        quality: 0.90,
        maxWidth: 2048,
        maxHeight: 2048,
        targetSizeKB: 1200
      });
      
      // Store the results
      setSelectedImage(file);
      setCompressedImageData(compressionResult.compressedDataUrl);
      setCompressionStats(compressionResult);

      // Log compression stats for debugging
      console.log('🖼️ Image compressed:', {
        originalSize: formatFileSize(compressionResult.originalSize),
        compressedSize: formatFileSize(compressionResult.compressedSize),
        compressionRatio: `${compressionResult.compressionRatio.toFixed(1)}%`,
        originalDimensions: compressionResult.originalDimensions,
        compressedDimensions: compressionResult.compressedDimensions,
        format: compressionResult.format
      });

    } catch (compressionError) {
      console.error('Image compression failed:', compressionError);
      setError(compressionError instanceof Error ? compressionError.message : 'Failed to compress image. Please try a different image.');
      
      // Fall back to original file without compression for compatibility
      setSelectedImage(file);
      setCompressedImageData(null);
      setCompressionStats(null);
    } finally {
      setIsCompressing(false);
    }
  }, []);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setCompressedImageData(null);
    setCompressionStats(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    selectedImage,
    compressedImageData,
    compressionStats,
    isCompressing,
    error,
    handleImageSelect,
    clearImage,
    clearError
  };
}