"use client";

import { Button } from "@/components/ui/button";
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
  return (
    <div className="flex items-center gap-2">
      {hasChecked && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearChecked}
          disabled={disabled}
        >
          Clear done
        </Button>
      )}

      {hasItems && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              Clear all
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all items?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove all items from your shopping list.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClearAll}>
                Clear all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
