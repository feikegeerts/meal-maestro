"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoDemoProps {
  videoSrc?: string;
  posterSrc?: string;
  className?: string;
}

export function VideoDemo({
  videoSrc,
  posterSrc,
  className,
}: VideoDemoProps) {
  return (
    <div className={cn("relative bg-muted rounded-lg overflow-hidden aspect-video", className)}>
        {videoSrc ? (
          <video
            className="w-full h-full object-cover"
            controls
            poster={posterSrc}
            preload="metadata"
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          // Placeholder when no video is provided
          <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
            <div className="text-center">
              <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Video coming soon</p>
            </div>
          </div>
        )}
    </div>
  );
}
