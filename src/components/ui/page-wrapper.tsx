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
        background: 'var(--background-gradient)',
        backgroundColor: 'var(--background)', // Fallback
      }}
    >
      {children}
    </div>
  );
}