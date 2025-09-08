import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AddIngredientButtonProps {
  onAdd: () => void;
  disabled?: boolean;
  t: (key: string) => string;
}

export function AddIngredientButton({ onAdd, disabled = false, t }: AddIngredientButtonProps) {
  return (
    <div className="flex justify-center pt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAdd}
        disabled={disabled}
        className="h-8 text-sm sm:h-9 sm:text-xs"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2" />
        {t("addIngredient")}
      </Button>
    </div>
  );
}