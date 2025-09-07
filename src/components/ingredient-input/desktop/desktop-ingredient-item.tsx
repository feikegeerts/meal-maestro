import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Grip } from "lucide-react";
import { RecipeIngredient, COOKING_UNITS } from "@/types/recipe";

interface DesktopIngredientItemProps {
  ingredient: RecipeIngredient;
  index: number;
  disabled?: boolean;
  onAmountChange: (id: string, value: string) => void;
  onUnitSelect: (id: string, unit: string) => void;
  onUpdate: (id: string, updates: Partial<RecipeIngredient>) => void;
  onRemove: (id: string) => void;
  ingredientsLength: number;
  t: (key: string) => string;
  tUnits: (key: string) => string;
  getStepSizeForUnit: (unit: string | null) => number;
}

export function DesktopIngredientItem({
  ingredient,
  index,
  disabled = false,
  onAmountChange,
  onUnitSelect,
  onUpdate,
  onRemove,
  ingredientsLength,
  t,
  tUnits,
  getStepSizeForUnit,
}: DesktopIngredientItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ingredient.id,
    transition: {
      duration: 150,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
    data: {
      type: "ingredient",
      ingredient,
      index,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Only log when transform starts (avoids spam)
  const windowDebug = (window as unknown) as Window & { [key: string]: boolean };
  if (
    transform &&
    (transform.x !== 0 || transform.y !== 0) &&
    !windowDebug[`logged-${ingredient.id}`]
  ) {
    console.log(
      "🖥️ DESKTOP:",
      ingredient.name,
      "transform:",
      transform,
      "isDragging:",
      isDragging
    );
    windowDebug[`logged-${ingredient.id}`] = true;
  } else if (!transform || (transform.x === 0 && transform.y === 0)) {
    windowDebug[`logged-${ingredient.id}`] = false;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-2 items-center py-2 min-h-[2.5rem]"
      {...attributes}
    >
      {/* Drag Handle */}
      <div className="w-6 flex justify-center">
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          disabled={disabled}
          className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing disabled:cursor-default disabled:hover:bg-transparent"
          type="button"
        >
          <Grip className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Index */}
      <div className="w-8 text-center text-sm text-muted-foreground">
        {index + 1}
      </div>

      {/* Amount */}
      <div className="w-20">
        <Input
          type="number"
          step={getStepSizeForUnit(ingredient.unit).toString()}
          min="0"
          placeholder="0"
          value={ingredient.amount || ""}
          onChange={(e) => onAmountChange(ingredient.id, e.target.value)}
          onKeyDown={(e) => {
            const char = String.fromCharCode(e.which);
            if (!/[0-9.,]/.test(char)) {
              e.preventDefault();
            }
          }}
          disabled={disabled}
          className="text-center h-9 text-sm"
          pattern="[0-9]*[.,]?[0-9]*"
          inputMode="decimal"
        />
      </div>

      {/* Unit */}
      <div className="w-24">
        <Select
          value={ingredient.unit || "none"}
          onValueChange={(value) => onUnitSelect(ingredient.id, value)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-</SelectItem>
            {COOKING_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {tUnits(unit)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ingredient Name */}
      <div className="flex-1">
        <Input
          placeholder={t("ingredientNamePlaceholder")}
          value={ingredient.name}
          onChange={(e) =>
            onUpdate(ingredient.id, {
              name: e.target.value,
            })
          }
          disabled={disabled}
          className="h-9 text-sm"
        />
      </div>

      {/* Notes */}
      <div className="w-32">
        <Input
          placeholder={t("notesPlaceholder")}
          value={ingredient.notes || ""}
          onChange={(e) =>
            onUpdate(ingredient.id, {
              notes: e.target.value,
            })
          }
          disabled={disabled}
          className="h-9 text-sm"
        />
      </div>

      {/* Remove Button */}
      <div className="w-8 text-center">
        {ingredientsLength > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(ingredient.id)}
            disabled={disabled}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
