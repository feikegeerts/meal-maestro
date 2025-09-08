"use client";

import * as React from "react";
import { Calendar, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateSelectionPopoverProps {
  onDateSelect: (date: Date) => void;
  disabled?: boolean;
  className?: string;
  triggerLabel?: string;
  showIcon?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  customTrigger?: React.ReactNode;
}

export function DateSelectionPopover({
  onDateSelect,
  disabled = false,
  className,
  triggerLabel,
  showIcon = true,
  variant = "outline",
  size = "default",
  customTrigger,
}: DateSelectionPopoverProps) {
  const t = useTranslations("recipes");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [open, setOpen] = React.useState(false);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onDateSelect(selectedDate);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setSelectedDate(new Date());
    setOpen(false);
  };

  const displayLabel = triggerLabel || t("markAsEatenOnDate");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {customTrigger || (
          <Button
            variant={variant}
            size={size}
            disabled={disabled}
            className={cn("justify-start", className)}
          >
            {showIcon && <Calendar className="mr-2 h-4 w-4" />}
            {displayLabel}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="space-y-3">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={handleDateChange}
            disabled={(date) => date > new Date()}
            initialFocus
            captionLayout="dropdown"
            fromYear={2020}
            toYear={new Date().getFullYear()}
          />

          <div className="flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleConfirm}
              disabled={!selectedDate}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}