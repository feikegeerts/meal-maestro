"use client";

import { useEffect, useRef } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

type VideoSource = {
  src: string;
  type: string;
};

const DEFAULT_OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0.35,
};

interface VideoDemoProps {
  videoSrc?: string;
  posterSrc?: string;
  className?: string;
  videoClassName?: string;
  sources?: VideoSource[];
  showControls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playWhenInView?: boolean;
  resetOnExit?: boolean;
  intersectionObserverOptions?: IntersectionObserverInit;
  disableDefaultContainerChrome?: boolean;
}

export function VideoDemo({
  videoSrc,
  posterSrc,
  className,
  videoClassName,
  sources,
  showControls = true,
  autoPlay = false,
  loop = false,
  muted,
  playWhenInView = false,
  resetOnExit = false,
  intersectionObserverOptions,
  disableDefaultContainerChrome = false,
}: VideoDemoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const resolvedSources =
    sources ?? (videoSrc ? [{ src: videoSrc, type: "video/mp4" }] : []);
  const shouldMute =
    muted !== undefined ? muted : autoPlay || playWhenInView;

  useEffect(() => {
    const videoElement = videoRef.current;
    const targetElement = containerRef.current ?? videoElement;

    if (!videoElement) {
      return;
    }

    videoElement.muted = shouldMute;

    if (playWhenInView && targetElement) {
      const options = intersectionObserverOptions ?? DEFAULT_OBSERVER_OPTIONS;
      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!videoRef.current) {
          return;
        }

        if (entry?.isIntersecting) {
          const playPromise = videoRef.current.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
              // Ignored – browsers can block autoplay if policies differ.
            });
          }
        } else {
          videoRef.current.pause();
          if (resetOnExit) {
            videoRef.current.currentTime = 0;
          }
        }
      }, options);

      observer.observe(targetElement);

      return () => observer.disconnect();
    }

    if (autoPlay) {
      const playPromise = videoElement.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // Autoplay can still fail if the browser blocks it.
        });
      }
    }
  }, [
    autoPlay,
    intersectionObserverOptions,
    playWhenInView,
    resetOnExit,
    shouldMute,
  ]);

  const containerBaseClasses = disableDefaultContainerChrome
    ? "relative overflow-hidden"
    : "relative overflow-hidden rounded-lg bg-muted";
  const containerClasses = cn(
    containerBaseClasses,
    className ?? "aspect-video",
  );
  const combinedVideoClassName = cn(
    "h-full w-full object-cover",
    videoClassName,
  );

  return (
    <div ref={containerRef} className={containerClasses}>
      {resolvedSources.length > 0 ? (
        <video
          ref={videoRef}
          className={combinedVideoClassName}
          controls={showControls && !playWhenInView}
          poster={posterSrc}
          preload="metadata"
          playsInline
          loop={loop}
          muted={shouldMute}
          autoPlay={autoPlay && !playWhenInView}
        >
          {resolvedSources.map(({ src, type }) => (
            <source key={`${src}-${type}`} src={src} type={type} />
          ))}
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
          <div className="text-center">
            <Play className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p className="text-sm">Video coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}
