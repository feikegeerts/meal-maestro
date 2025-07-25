import { Loader2 } from "lucide-react";

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = "Loading..." }: PageLoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-600 dark:text-orange-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-300">{text}</p>
      </div>
    </div>
  );
}