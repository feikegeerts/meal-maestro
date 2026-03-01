"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface UnlinkPartnerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (copyRecipes: boolean) => void;
  isPending: boolean;
}

export function UnlinkPartnerModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: UnlinkPartnerModalProps) {
  const t = useTranslations("account.partner.unlink");
  const [copyRecipes, setCopyRecipes] = useState(false);

  function handleConfirm() {
    onConfirm(copyRecipes);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 py-2">
          <Checkbox
            id="copy-recipes"
            checked={copyRecipes}
            onCheckedChange={(checked) => setCopyRecipes(!!checked)}
            disabled={isPending}
          />
          <div className="space-y-1">
            <Label htmlFor="copy-recipes" className="font-medium cursor-pointer">
              {t("copyRecipesLabel")}
            </Label>
            <p className="text-sm text-muted-foreground">{t("copyRecipesDescription")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? t("unlinking") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
