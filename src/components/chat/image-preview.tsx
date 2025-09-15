"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, RotateCw } from "lucide-react";
import Image from "next/image";

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
  onProcessed?: (processedFile: File) => void;
  className?: string;
}

export function ImagePreview({ file, onRemove, onProcessed, className = "" }: ImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    
    // Cleanup on unmount
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    
    if (onProcessed) {
      // In a real implementation, you might want to create a new rotated image
      // For now, we'll just pass the original file back
      onProcessed(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse">
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading image...</span>
      </div>
    );
  }

  return (
    <div className={`relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 ${className}`}>
      {/* Image preview */}
      <div className="relative overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-700">
        <Image
          src={imageUrl}
          alt="Recipe image preview"
          width={400}
          height={128}
          className="w-full h-32 object-cover"
          style={{
            transform: `rotate(${rotation}deg)`
          }}
        />
        
        {/* Remove button */}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={onRemove}
          className="absolute top-1 right-1 h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
        
        {/* Rotate button */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={handleRotate}
          className="absolute top-1 left-1 h-6 w-6"
        >
          <RotateCw className="h-3 w-3" />
        </Button>
      </div>
      
      {/* File info */}
      <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
        <div className="truncate font-medium">{file.name}</div>
        <div className="flex justify-between">
          <span>{formatFileSize(file.size)}</span>
          <span>{file.type}</span>
        </div>
      </div>
    </div>
  );
}