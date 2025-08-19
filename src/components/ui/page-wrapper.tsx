import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div
      className={cn("min-h-screen", className)}
      style={{
        background: "var(--background-gradient)",
        backgroundColor: "var(--background)", // Fallback
      }}
    >
      <div className="container mx-auto px-4 pt-4 pb-8">
        <div className={"mx-auto"}>{children}</div>
      </div>
    </div>
  );
}
