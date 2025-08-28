import Image from "next/image";
import { cn } from "@/lib/utils";

interface ChefHatIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export function ChefHatIcon({ className, width = 24, height = 24 }: ChefHatIconProps) {
  return (
    <Image
      src="/chef-hat-sparkle-inline.svg"
      alt="Chef Hat"
      width={width}
      height={height}
      className={cn("inline-block", className)}
    />
  );
}