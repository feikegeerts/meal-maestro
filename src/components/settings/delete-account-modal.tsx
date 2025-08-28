"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "@/app/i18n/routing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountModal({ open, onOpenChange }: DeleteAccountModalProps) {
  const t = useTranslations("account.deleteAccountModal");
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const userEmail = user?.email || "";
  const isConfirmationValid = confirmationText.toLowerCase().trim() === userEmail.toLowerCase();

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationText("");
      onOpenChange(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!isConfirmationValid || !user) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationPhrase: confirmationText.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete account");
      }

      // Show success message
      toast.success(t("success"));

      // Sign out and redirect
      await signOut();
      router.push("/");

    } catch (error) {
      console.error("Delete account error:", error);
      toast.error(error instanceof Error ? error.message : t("error"));
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-left">
            {t("warning")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Confirmation input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              {t("confirmationLabel")}{" "}
              <span className="font-mono text-destructive">{userEmail}</span>
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
              className={
                confirmationText &&
                !isConfirmationValid
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-destructive">{t("confirmationMismatch")}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={!isConfirmationValid || isDeleting}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isDeleting ? t("deleting") : t("confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}