import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div
      className={cn(
        // Full-height on screen; revert for print to avoid empty trailing page
        "min-h-screen print:min-h-0 print:h-auto print:bg-white",
        className
      )}
      style={{
        background: "var(--background-gradient)",
        backgroundColor: "var(--background)",
      }}
    >
      <div className="container mx-auto px-4 pt-4 pb-8 print:pt-2 print:pb-2 print:px-4">
        <div className="mx-auto print:max-w-full print:break-before-auto print:break-after-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
