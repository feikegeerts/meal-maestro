"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CinematicContainerProps {
  children?: ReactNode;
  className?: string;
  variant?: "video" | "image" | "demo";
  aspectRatio?: "video" | "square" | "portrait";
  placeholder?: ReactNode;
  overlayContent?: ReactNode;
  autoPlay?: boolean;
  loop?: boolean;
}

export function CinematicContainer({
  children,
  className,
  variant = "demo",
  aspectRatio = "video",
  placeholder,
  overlayContent,
}: CinematicContainerProps) {

  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
  };

  const variantClasses = {
    video: "overflow-hidden",
    image: "overflow-hidden",
    demo: "overflow-hidden",
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-gradient-to-br",
        aspectClasses[aspectRatio],
        variantClasses[variant],
        className
      )}
    >
      {/* Background gradient based on variant */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl",
          variant === "video" && "from-primary/10 to-primary/20",
          variant === "image" && "from-secondary/10 to-secondary/20",
          variant === "demo" && "from-accent/10 to-accent/20"
        )}
      />

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children || (
          <div className="flex items-center justify-center h-full">
            {placeholder || (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 rounded-full bg-muted/40 animate-pulse" />
                </div>
                <p className="text-muted-foreground text-sm">Content Placeholder</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlay content */}
      {overlayContent && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 rounded-2xl">
          {overlayContent}
        </div>
      )}

      {/* Loading state placeholder for future video integration */}
    </div>
  );
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoadedData?: () => void;
}

export function VideoPlayer({
  src,
  poster,
  className,
  autoPlay = true,
  loop = true,
  muted = true,
  controls = false,
  onLoadedData,
}: VideoPlayerProps) {
  return (
    <video
      src={src}
      poster={poster}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      controls={controls}
      playsInline
      className={cn("w-full h-full object-cover", className)}
      onLoadedData={onLoadedData}
    />
  );
}

interface InteractiveDemoProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
  variant?: "simple" | "detailed" | "fullscreen";
}

export function InteractiveDemo({
  title,
  description,
  icon,
  children,
  className,
  onClick,
  isActive = false,
  variant = "simple",
}: InteractiveDemoProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "fullscreen":
        return "min-h-[32rem] max-h-[40rem]";
      case "detailed":
        return "min-h-[24rem] max-h-[36rem]";
      default:
        return "min-h-80 max-h-96";
    }
  };

  return (
    <div
      className={cn(
        "group transition-all duration-300 w-full max-w-xl mx-auto",
        onClick && "cursor-pointer hover:scale-105",
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
      onClick={onClick}
    >
      <CinematicContainer
        variant="demo"
        className={cn(
          "glass-effect w-full",
          getVariantClasses(),
          isActive && "bg-primary/5"
        )}
      >
        <div className="flex flex-col h-full">
          {variant === "simple" && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              {icon && (
                <div className="mb-6 text-primary group-hover:scale-110 transition-transform duration-300">
                  {icon}
                </div>
              )}
              <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mb-4">{description}</p>
              )}
              {children}
            </div>
          )}

          {(variant === "detailed" || variant === "fullscreen") && (
            <>
              <div className="flex items-center p-4 border-b border-border/20 flex-shrink-0">
                {icon && (
                  <div className="mr-3 text-primary">
                    {icon}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  {description && (
                    <p className="text-xs text-muted-foreground">{description}</p>
                  )}
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                {children}
              </div>
            </>
          )}
        </div>
      </CinematicContainer>
    </div>
  );
}