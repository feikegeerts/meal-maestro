"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseIngredientString } from "@/lib/recipe-utils";
import { useTranslations } from "next-intl";

interface AddItemBarProps {
  onAdd: (item: { name: string; amount: number | null; unit: string | null }) => void;
  disabled?: boolean;
}

export function AddItemBar({ onAdd, disabled }: AddItemBarProps) {
  const t = useTranslations("shoppingList");
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    const parsed = parseIngredientString(trimmed);
    onAdd({
      name: parsed.name,
      amount: parsed.amount,
      unit: parsed.unit,
    });
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("addPlaceholder")}
        disabled={disabled}
        className="flex-1"
        aria-label="New shopping list item"
      />
      <Button type="submit" disabled={disabled || !value.trim()} size="icon" aria-label="Add item">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
