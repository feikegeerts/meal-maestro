"use client";

import { useState } from "react";
import {
  Link,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { demoUrlSources, type DemoUrlSource } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

interface UrlImportDemoProps {
  className?: string;
}

type ImportState = "idle" | "analyzing" | "scraping" | "success" | "error";

export function UrlImportDemo({ className }: UrlImportDemoProps) {
  const [url, setUrl] = useState("");
  const [importState, setImportState] = useState<ImportState>("idle");
  const [selectedSource, setSelectedSource] = useState<DemoUrlSource | null>(
    null
  );
  const [progress, setProgress] = useState(0);

  const simulateImport = async (source: DemoUrlSource) => {
    setSelectedSource(source);
    setImportState("analyzing");
    setProgress(0);

    // Simulate URL analysis
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setProgress(33);

    if (!source.isSupported) {
      setImportState("error");
      return;
    }

    setImportState("scraping");
    setProgress(66);

    // Simulate scraping
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setProgress(100);
    setImportState("success");
  };

  const handleUrlImport = async () => {
    if (!url) return;

    const matchingSource = demoUrlSources.find(
      (source) =>
        source.url.toLowerCase().includes(url.toLowerCase()) ||
        url.toLowerCase().includes(source.url.toLowerCase())
    );

    if (matchingSource) {
      await simulateImport(matchingSource);
    } else {
      // Create a mock source for unknown URLs
      const mockSource: DemoUrlSource = {
        url,
        title: "Unknown Recipe Source",
        description: "Testing URL import functionality",
        type: "recipe",
        isSupported: Math.random() > 0.3, // 70% success rate
      };
      await simulateImport(mockSource);
    }
  };

  const reset = () => {
    setUrl("");
    setImportState("idle");
    setSelectedSource(null);
    setProgress(0);
  };

  const getStateIcon = () => {
    switch (importState) {
      case "analyzing":
      case "scraping":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Link className="h-4 w-4" />;
    }
  };

  const getStateMessage = () => {
    switch (importState) {
      case "analyzing":
        return "Analyzing URL structure...";
      case "scraping":
        return "Extracting recipe data...";
      case "success":
        return "Recipe imported successfully!";
      case "error":
        return selectedSource?.type === "video"
          ? "Video URLs not supported yet"
          : "Unable to extract recipe data";
      default:
        return "Enter a recipe URL to import";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* URL Input */}
      <div className="space-y-2">
        <div className="relative">
          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder="https://example.com/recipe"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-10 h-9"
            disabled={importState === "analyzing" || importState === "scraping"}
          />
        </div>

        <Button
          onClick={handleUrlImport}
          disabled={
            !url || importState === "analyzing" || importState === "scraping"
          }
          className="w-full h-9"
          size="sm"
        >
          {getStateIcon()}
          <span className="ml-2">
            {importState === "analyzing" || importState === "scraping"
              ? "Importing..."
              : "Import Recipe"}
          </span>
        </Button>
      </div>

      {/* Progress Bar */}
      {(importState === "analyzing" || importState === "scraping") && (
        <div className="space-y-1">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{getStateMessage()}</p>
        </div>
      )}

      {/* Result */}
      {selectedSource &&
        importState !== "analyzing" &&
        importState !== "scraping" && (
          <div
            className={cn(
              "p-3 rounded border",
              importState === "success" && "border-green-200 bg-green-50/50",
              importState === "error" && "border-red-200 bg-red-50/50"
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStateIcon()}
                <span className="text-sm font-medium">{getStateMessage()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="h-6 px-2"
              >
                <XCircle className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              <h6 className="font-medium text-sm">{selectedSource.title}</h6>
              <p className="text-xs text-muted-foreground">
                {selectedSource.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs h-5">
                    {selectedSource.type}
                  </Badge>
                  {selectedSource.isSupported ? (
                    <Badge
                      variant="default"
                      className="text-xs h-5 bg-green-100 text-green-800"
                    >
                      Supported
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs h-5">
                      Not Supported
                    </Badge>
                  )}
                </div>

                <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                  <a
                    href={selectedSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>

              {importState === "success" && (
                <div className="pt-2 border-t border-border/20">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>✓ Recipe title extracted</div>
                    <div>✓ Ingredients list parsed</div>
                    <div>✓ Instructions formatted</div>
                    <div>✓ Cooking time detected</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Sample URLs */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-muted-foreground">
          Try these sample URLs:
        </h5>
        <div className="space-y-1">
          {demoUrlSources.slice(0, 3).map((source, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-auto py-2 px-3 text-left"
              onClick={() => setUrl(source.url)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {source.title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {source.url}
                </div>
              </div>
              <Badge
                variant={source.isSupported ? "default" : "destructive"}
                className="text-xs h-4 ml-2 flex-shrink-0"
              >
                {source.type}
              </Badge>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
