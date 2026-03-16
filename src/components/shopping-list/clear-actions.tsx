"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ClearActionsProps {
  hasChecked: boolean;
  hasItems: boolean;
  onClearChecked: () => void;
  onClearAll: () => void;
  disabled?: boolean;
}

export function ClearActions({
  hasChecked,
  hasItems,
  onClearChecked,
  onClearAll,
  disabled,
}: ClearActionsProps) {
  const t = useTranslations("shoppingList");
  return (
    <div className="flex items-center gap-2">
      {hasChecked && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearChecked}
          disabled={disabled}
        >
          {t("clearDone")}
        </Button>
      )}

      {hasItems && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              {t("clearAll")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("clearAllTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("clearAllDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={onClearAll}>
                {t("clearAll")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
