"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Camera, Upload, ChevronDown, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface ImageUploadButtonProps {
  onImageSelect: (file: File) => void;
  disabled?: boolean;
  variant?: "icon" | "button";
  showDropdown?: boolean; // Whether to show camera/gallery options
}

export function ImageUploadButton({ 
  onImageSelect, 
  disabled = false,
  variant = "icon",
  showDropdown = true
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("chat");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file must be smaller than 5MB');
        return;
      }
      
      onImageSelect(file);
    }
    
    // Reset input to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleGalleryClick = () => {
    setIsOpen(false);
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    setIsOpen(false);
    cameraInputRef.current?.click();
  };

  const handleDirectClick = () => {
    if (showDropdown) {
      setIsOpen(!isOpen);
    } else {
      fileInputRef.current?.click();
    }
  };

  // Detect if device likely supports camera
  const isMobileDevice = () => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  if (variant === "icon") {
    if (showDropdown) {
      return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="h-10 w-10 flex-shrink-0"
              title="Upload image"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isMobileDevice() ? (
              <>
                <DropdownMenuItem onClick={handleCameraClick}>
                  <Camera className="mr-2 h-4 w-4" />
                  {t("takePhoto")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGalleryClick}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {t("chooseFromGallery")}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={handleGalleryClick}>
                <Upload className="mr-2 h-4 w-4" />
                {t("uploadImage")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
          
          {/* Gallery input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Camera input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment" // Use back camera by default
            onChange={handleFileSelect}
            className="hidden"
          />
        </DropdownMenu>
      );
    } else {
      return (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDirectClick}
            disabled={disabled}
            className="h-10 w-10 flex-shrink-0"
            title="Upload image"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      );
    }
  }

  if (showDropdown) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {t("uploadImage")}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isMobileDevice() ? (
            <>
              <DropdownMenuItem onClick={handleCameraClick}>
                <Camera className="mr-2 h-4 w-4" />
                {t("takePhoto")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGalleryClick}>
                <ImageIcon className="mr-2 h-4 w-4" />
                {t("chooseFromGallery")}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={handleGalleryClick}>
              <Upload className="mr-2 h-4 w-4" />
              {t("uploadImage")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
        
        {/* Gallery input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {/* Camera input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment" // Use back camera by default
          onChange={handleFileSelect}
          className="hidden"
        />
      </DropdownMenu>
    );
  } else {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          onClick={handleDirectClick}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {t("uploadImage")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </>
    );
  }
}