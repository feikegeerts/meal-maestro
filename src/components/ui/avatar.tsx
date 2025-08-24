"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import Image from "next/image"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  src,
  alt = "Avatar",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const [imageError, setImageError] = React.useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  if (!src || typeof src !== 'string' || imageError) {
    return null;
  }

  // Filter out props that are not compatible with Next.js Image
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    onLoadingStatusChange,
    asChild,
    width,
    height,
    ...imageProps
  } = props;
  /* eslint-enable @typescript-eslint/no-unused-vars */

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={cn("aspect-square object-cover", className)}
      quality={75}
      unoptimized={src.includes('googleusercontent.com')}
      sizes="(max-width: 48px) 48px, (max-width: 96px) 96px, 128px"
      onLoad={() => {
        if (onLoadingStatusChange) {
          onLoadingStatusChange('loaded');
        }
      }}
      onError={() => {
        setImageError(true);
        if (onLoadingStatusChange) {
          onLoadingStatusChange('error');
        }
      }}
      {...imageProps}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
