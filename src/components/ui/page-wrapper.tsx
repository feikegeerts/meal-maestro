import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl";
}

export function PageWrapper({
  children,
  className,
  maxWidth = "7xl",
}: PageWrapperProps) {
  const maxWidthClass = `max-w-${maxWidth}`;

  return (
    <div
      className={cn("min-h-screen", className)}
      style={{
        background: "var(--background-gradient)",
        backgroundColor: "var(--background)", // Fallback
      }}
    >
      <div className="container mx-auto px-4 pt-4 pb-8">
        <div className={cn(maxWidthClass, "mx-auto")}>{children}</div>
      </div>
    </div>
  );
}
