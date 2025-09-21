"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollAnimationProps {
  children: React.ReactNode;
  className?: string;
  animation?:
    | "fadeIn"
    | "slideUp"
    | "slideLeft"
    | "slideRight"
    | "scaleIn"
    | "parallax"
    | "textReveal"; // newly added variant
  delay?: number;
  duration?: number;
  offset?: number;
  parallaxSpeed?: number;
}

export function ScrollAnimation({
  children,
  className,
  animation = "fadeIn",
  delay = 0,
  duration = 0.6,
  offset = 0.1,
  parallaxSpeed = 0.5,
}: ScrollAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000);
        }
      },
      { threshold: offset }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    // Parallax scroll handler
    const handleScroll = () => {
      if (animation === "parallax") {
        setScrollY(window.scrollY);
      }
    };

    if (animation === "parallax") {
      window.addEventListener("scroll", handleScroll);
    }

    return () => {
      observer.disconnect();
      if (animation === "parallax") {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [delay, offset, animation]);

  const getAnimationClasses = () => {
    const base = "transition-all ease-out";
    const durationClass = `duration-[${Math.round(duration * 1000)}ms]`;

    if (!isVisible) {
      switch (animation) {
        case "fadeIn":
          return `${base} ${durationClass} opacity-0`;
        case "slideUp":
          return `${base} ${durationClass} opacity-0 translate-y-8`;
        case "slideLeft":
          return `${base} ${durationClass} opacity-0 translate-x-8`;
        case "slideRight":
          return `${base} ${durationClass} opacity-0 -translate-x-8`;
        case "scaleIn":
          return `${base} ${durationClass} opacity-0 scale-95`;
        case "parallax":
          return `${base}`;
        case "textReveal":
          // Start hidden with clip-path to allow reveal; duration handled by keyframe if using animate-* utility, else fallback to transition
          return `${base} ${durationClass} opacity-0 translate-y-5 [clip-path:inset(100%_0_0_0)]`;
        default:
          return `${base} ${durationClass} opacity-0`;
      }
    }

    if (animation === "textReveal") {
      // Final visible state matching keyframe end state
      return `${base} ${durationClass} opacity-100 translate-y-0 [clip-path:inset(0_0_0_0)]`;
    }

    return `${base} ${durationClass} opacity-100 translate-x-0 translate-y-0 scale-100`;
  };

  const getParallaxStyle = () => {
    if (animation === "parallax" && elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const elementTop = rect.top + window.scrollY;
      const elementHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Calculate parallax offset
      const scrollProgress =
        (scrollY - elementTop + windowHeight) / (windowHeight + elementHeight);
      const parallaxOffset = scrollProgress * parallaxSpeed * 100;

      return {
        transform: `translateY(${parallaxOffset}px)`,
      };
    }
    return {};
  };

  return (
    <div
      ref={elementRef}
      className={cn(getAnimationClasses(), className)}
      style={getParallaxStyle()}
    >
      {children}
    </div>
  );
}

interface StaggeredAnimationProps {
  children: React.ReactNode[];
  className?: string;
  animation?: "fadeIn" | "slideUp" | "slideLeft" | "slideRight" | "scaleIn";
  staggerDelay?: number;
  offset?: number;
}

export function StaggeredAnimation({
  children,
  className,
  animation = "slideUp",
  staggerDelay = 0.1,
  offset = 0.1,
}: StaggeredAnimationProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <ScrollAnimation
          key={index}
          animation={animation}
          delay={index * staggerDelay}
          offset={offset}
        >
          {child}
        </ScrollAnimation>
      ))}
    </div>
  );
}

interface MorphingLayoutProps {
  children: React.ReactNode;
  className?: string;
  fromLayout: string;
  toLayout: string;
  triggerOffset?: number;
}

export function MorphingLayout({
  children,
  className,
  fromLayout,
  toLayout,
  triggerOffset = 0.3,
}: MorphingLayoutProps) {
  const [isMorphed, setIsMorphed] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMorphed(entry.isIntersecting);
      },
      { threshold: triggerOffset }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [triggerOffset]);

  return (
    <div
      ref={elementRef}
      className={cn(
        "transition-all duration-1000 ease-out",
        isMorphed ? toLayout : fromLayout,
        className
      )}
    >
      {children}
    </div>
  );
}

interface FloatingElementProps {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
}

export function FloatingElement({
  children,
  className,
  amplitude = 10,
  duration = 3,
  delay = 0,
}: FloatingElementProps) {
  return (
    <div
      className={cn("animate-bounce", className)}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        animationTimingFunction: "ease-in-out",
        animationIterationCount: "infinite",
        animationDirection: "alternate",
        transform: `translateY(${amplitude}px)`,
      }}
    >
      {children}
    </div>
  );
}
