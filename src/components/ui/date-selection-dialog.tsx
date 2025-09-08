"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDateSelect: (date: Date) => void;
  title?: string;
  description?: string;
  initialDate?: Date;
}

export function DateSelectionDialog({
  open,
  onOpenChange,
  onDateSelect,
  title,
  description,
  initialDate,
}: DateSelectionDialogProps) {
  const t = useTranslations("datePicker");
  const defaultDate = React.useMemo(() => initialDate || new Date(), [initialDate]);
  const [selectedDate, setSelectedDate] = React.useState<Date>(defaultDate);

  const handleConfirm = () => {
    onDateSelect(selectedDate);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedDate(defaultDate);
    onOpenChange(false);
  };

  React.useEffect(() => {
    if (open) {
      setSelectedDate(defaultDate);
    }
  }, [open, defaultDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {title || t("selectDate")}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex justify-center py-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            captionLayout="dropdown"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("cancel")}
          </Button>
          <Button onClick={handleConfirm}>
            {t("confirm")} {selectedDate && `(${format(selectedDate, "PP")})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}