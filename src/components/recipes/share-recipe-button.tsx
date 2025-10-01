"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Check, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ShareRecipeButtonProps {
  recipeId: string;
  disabled?: boolean;
}

interface ShareLinkState {
  slug: string;
  allowSave: boolean;
  expiresAt: string | null;
  createdAt: string | null;
}

export function ShareRecipeButton({
  recipeId,
  disabled = false,
}: ShareRecipeButtonProps) {
  const tRecipes = useTranslations("recipes");
  const [open, setOpen] = useState(false);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareLinkState | null>(null);
  const [allowSave, setAllowSave] = useState<boolean>(true);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [operation, setOperation] = useState<"generate" | "stop" | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isShared = !!shareInfo;
  const actionLoading = operation !== null;
  const storageKey = useMemo(
    () => (typeof window !== "undefined" ? `recipe-share-${recipeId}` : null),
    [recipeId]
  );

  const fullShareUrl = useMemo(() => {
    if (!sharePath) {
      return "";
    }
    if (typeof window === "undefined") {
      return sharePath;
    }
    return `${window.location.origin}${sharePath}`;
  }, [sharePath]);

  const loadShareInfo = useCallback(async () => {
    setStatusLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/share`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        setShareInfo(null);
        setSharePath(null);
        setAllowSave(true);
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || tRecipes("shareDialog.statusFailed"));
      }

      const data = await response.json();
      if (data.share) {
        const info: ShareLinkState = {
          slug: data.share.slug,
          allowSave: data.share.allowSave,
          expiresAt: data.share.expiresAt ?? null,
          createdAt: data.share.createdAt ?? null,
        };
        setShareInfo(info);
        setAllowSave(info.allowSave);

        if (storageKey) {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { slug: string; path: string };
              if (parsed.slug === info.slug && typeof parsed.path === "string") {
                setSharePath(parsed.path);
              } else {
                setSharePath(null);
              }
            } catch {
              setSharePath(null);
            }
          } else {
            setSharePath(null);
          }
        }
      } else {
        setShareInfo(null);
        setSharePath(null);
        setAllowSave(true);
      }
    } catch (err) {
      console.error("Failed to fetch share status", err);
      setError(err instanceof Error ? err.message : tRecipes("shareDialog.statusFailed"));
      setShareInfo(null);
      setSharePath(null);
    } finally {
      setStatusLoading(false);
    }
  }, [recipeId, tRecipes, storageKey]);

  useEffect(() => {
    loadShareInfo().catch(() => {
      /* handled in function */
    });
  }, [loadShareInfo]);

  useEffect(() => {
    if (open) {
      loadShareInfo().catch(() => {
        /* handled */
      });
      setCopySuccess(false);
    }
  }, [open, loadShareInfo]);

  const generateShareLink = useCallback(async () => {
    try {
      setOperation("generate");
      setError(null);
      setCopySuccess(false);

      const response = await fetch(`/api/recipes/${recipeId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || tRecipes("shareDialog.failed"));
      }

      const data = await response.json();
      setSharePath(data.sharePath);
      if (storageKey) {
        try {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ slug: data.slug, path: data.sharePath })
          );
        } catch {
          // ignore storage errors
        }
      }
      setShareInfo({
        slug: data.slug,
        allowSave: data.allowSave ?? true,
        expiresAt: data.expiresAt ?? null,
        createdAt: data.createdAt ?? null,
      });
      setAllowSave(data.allowSave ?? true);
    } catch (err) {
      console.error("Failed to generate share link", err);
      setError(err instanceof Error ? err.message : tRecipes("shareDialog.failed"));
      setSharePath(null);
    } finally {
      setOperation(null);
    }
  }, [recipeId, tRecipes, storageKey]);

  const handleStopSharing = useCallback(async () => {
    try {
      setOperation("stop");
      setError(null);

      const response = await fetch(`/api/recipes/${recipeId}/share`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || tRecipes("shareDialog.stopFailed"));
      }

      setShareInfo(null);
      setSharePath(null);
      setAllowSave(true);
      if (storageKey) {
        window.localStorage.removeItem(storageKey);
      }
    } catch (err) {
      console.error("Failed to stop sharing", err);
      setError(err instanceof Error ? err.message : tRecipes("shareDialog.stopFailed"));
    } finally {
      setOperation(null);
    }
  }, [recipeId, tRecipes, storageKey]);

  const handleCopy = useCallback(async () => {
    if (!fullShareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy share URL", err);
      setCopySuccess(false);
      setError(tRecipes("shareDialog.copyFailed"));
    }
  }, [fullShareUrl, tRecipes]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={tRecipes("shareRecipe")}
        aria-label={tRecipes("shareRecipe")}
        className={cn(
          "group transition-colors",
          isShared ? "border-primary hover:bg-primary/10" : undefined
        )}
      >
        <Share2
          className={cn(
            "h-4 w-4 transition-colors",
            isShared
              ? "text-primary group-hover:text-primary"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        />
        <span className="sr-only">{tRecipes("shareRecipe")}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tRecipes("shareDialog.title")}</DialogTitle>
            <DialogDescription>
              {tRecipes("shareDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="space-y-2 text-sm">
              {statusLoading ? (
                <p className="text-muted-foreground">
                  {tRecipes("shareDialog.fetchingStatus")}
                </p>
              ) : (
                <>
                  <p
                    className={`font-semibold ${
                      isShared ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {isShared
                      ? tRecipes("shareDialog.statusShared")
                      : tRecipes("shareDialog.statusNotShared")}
                  </p>

                  {isShared && shareInfo?.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      {tRecipes("shareDialog.sharedOn", {
                        date: new Date(shareInfo.createdAt).toLocaleString(),
                      })}
                    </p>
                  )}

                  {isShared && shareInfo?.expiresAt && (
                    <p className="text-xs text-muted-foreground">
                      {tRecipes("shareDialog.expires", {
                        date: new Date(shareInfo.expiresAt).toLocaleString(),
                      })}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {(shareInfo?.allowSave ?? allowSave)
                      ? tRecipes("shareDialog.allowSaveNote")
                      : tRecipes("shareDialog.readOnlyNote")}
                  </p>

                  {sharePath ? (
                    <div className="space-y-2">
                      <Label htmlFor="recipe-share-url">
                        {tRecipes("shareDialog.linkLabel")}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="recipe-share-url"
                          readOnly
                          value={fullShareUrl}
                          className="font-mono"
                          placeholder={actionLoading ? tRecipes("shareDialog.loading") : ""}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCopy}
                          disabled={!fullShareUrl || actionLoading}
                        >
                          {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : isShared ? (
                    <p className="text-xs text-muted-foreground">
                      {tRecipes("shareDialog.noLinkNote")}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-wrap justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={actionLoading}
              >
                {tRecipes("shareDialog.close")}
              </Button>
              {isShared && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleStopSharing}
                  disabled={actionLoading}
                >
                  {operation === "stop" && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {tRecipes("shareDialog.stop")}
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              className="transition-colors text-muted-foreground hover:text-foreground"
              onClick={generateShareLink}
              disabled={actionLoading || statusLoading}
            >
              {operation === "generate" && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isShared
                ? tRecipes("shareDialog.regenerate")
                : tRecipes("shareDialog.generate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
