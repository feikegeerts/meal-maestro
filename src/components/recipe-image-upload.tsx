"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Upload, X, Loader2, Edit3 } from "lucide-react";
import Image from "next/image";
import { IMAGE_COMPRESSION_CONFIG } from "@/lib/image-compression-config";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface RecipeImageUploadProps {
  recipeId: string;
  currentImageUrl?: string | null;
  recipeTitle: string;
  onImageUpdated: (imageUrl: string | null) => void;
  className?: string;
}

export function RecipeImageUpload({
  recipeId,
  currentImageUrl,
  recipeTitle,
  onImageUpdated,
  className = ""
}: RecipeImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("recipes.imageUpload");

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    event.target.value = '';

    // Validate file type
    if (!IMAGE_COMPRESSION_CONFIG.SUPPORTED_FORMATS.includes(file.type as typeof IMAGE_COMPRESSION_CONFIG.SUPPORTED_FORMATS[number])) {
      toast.error(t("invalidFileType"), {
        description: IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.UNSUPPORTED_FORMAT,
      });
      return;
    }

    // Validate file size
    if (file.size > IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES) {
      toast.error(t("fileTooLarge"), {
        description: IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE,
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/recipes/${recipeId}/image`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      onImageUpdated(data.imageUrl);
      
      toast.success(t("imageUploaded"), {
        description: t("imageUploadedDescription"),
      });

    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(t("uploadFailed"), {
        description: error instanceof Error ? error.message : t("uploadFailed"),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!currentImageUrl) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/recipes/${recipeId}/image`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete image');
      }

      onImageUpdated(null);
      
      toast.success(t("imageRemoved"), {
        description: t("imageRemovedDescription"),
      });

    } catch (error) {
      console.error('Image deletion error:', error);
      toast.error(t("deleteFailed"), {
        description: error instanceof Error ? error.message : t("deleteFailed"),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isUploading || isDeleting;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_COMPRESSION_CONFIG.SUPPORTED_FORMATS.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className={`relative h-64 sm:h-80 lg:h-[600px] group ${className}`}>
        {/* Image display */}
        <Image
          src={currentImageUrl || "/placeholder-image.webp"}
          alt={`Recipe photo for ${recipeTitle}`}
          fill
          priority
          className="rounded-xl object-cover shadow-lg"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
        />

        {/* Desktop: hover overlay */}
        <div className="hidden md:flex absolute inset-0 items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              className="bg-white/90 hover:bg-white text-gray-900 font-semibold shadow-lg"
              onClick={handleFileSelect}
              disabled={isLoading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : currentImageUrl ? (
                <Camera className="mr-2 h-5 w-5" />
              ) : (
                <Upload className="mr-2 h-5 w-5" />
              )}
              {isUploading
                ? t("uploading")
                : currentImageUrl
                ? t("changePhoto")
                : t("addPhoto")
              }
            </Button>

            {/* Delete button (only show if image exists) */}
            {currentImageUrl && (
              <Button
                variant="destructive"
                size="lg"
                className="font-semibold shadow-lg"
                onClick={handleDeleteImage}
                disabled={isLoading}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                {isDeleting ? t("removing") : t("remove")}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile: Edit button */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <div className="md:hidden absolute top-2 right-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white shadow-lg touch-target h-10 w-10 p-0"
                disabled={isLoading}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          </DrawerTrigger>
          
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t("editPhoto")}</DrawerTitle>
            </DrawerHeader>
            
            <div className="px-4 pb-4 space-y-4">
              {/* Image in drawer */}
              <div className="relative h-64 w-full">
                <Image
                  src={currentImageUrl || "/placeholder-image.webp"}
                  alt={`Recipe photo for ${recipeTitle}`}
                  fill
                  className="rounded-lg object-cover"
                  sizes="100vw"
                />
              </div>
              
              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full font-semibold"
                  onClick={() => {
                    handleFileSelect();
                    setDrawerOpen(false);
                  }}
                  disabled={isLoading}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : currentImageUrl ? (
                    <Camera className="mr-2 h-5 w-5" />
                  ) : (
                    <Upload className="mr-2 h-5 w-5" />
                  )}
                  {isUploading
                    ? t("uploading")
                    : currentImageUrl
                    ? t("changePhoto")
                    : t("addPhoto")
                  }
                </Button>

                {/* Delete button (only show if image exists) */}
                {currentImageUrl && (
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full font-semibold"
                    onClick={() => {
                      handleDeleteImage();
                      setDrawerOpen(false);
                    }}
                    disabled={isLoading}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <X className="mr-2 h-5 w-5" />
                    )}
                    {isDeleting ? t("removing") : t("remove")}
                  </Button>
                )}
                
                <DrawerClose asChild>
                  <Button variant="outline" size="lg" className="w-full">
                    {t("cancel")}
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Loading overlay for better UX */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
            <div className="text-white text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">
                {isUploading ? t("processingImage") : t("removingImage")}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}