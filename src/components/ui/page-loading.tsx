import { Loader2 } from "lucide-react";

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = "Loading..." }: PageLoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}