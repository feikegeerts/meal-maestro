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
  const windowDebug = window as unknown as Window & { [key: string]: boolean };
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
      className="bg-muted/30 rounded-lg p-4"
      {...attributes}
    >
      <div className="flex items-start gap-3">
        {/* Left side: Drag handle and index */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            ref={setActivatorNodeRef}
            {...listeners}
            disabled={disabled}
            className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing disabled:cursor-default disabled:hover:bg-transparent"
            type="button"
          >
            <Grip className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="text-sm font-medium text-muted-foreground min-w-[1.5rem] text-center">
            {index + 1}.
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 space-y-3">
          {/* Top row: Amount and Unit inline */}
          <div className="flex items-center gap-2">
            <div className="w-20">
              <Input
                type="number"
                step={getStepSizeForUnit(ingredient.unit).toString()}
                min="0"
                placeholder="0"
                value={ingredient.amount || ""}
                onChange={(e) => onAmountChange(ingredient.id, e.target.value)}
                onKeyDown={(e) => {
                  const char = e.key;
                  if (!/[0-9.,]/.test(char)) {
                    e.preventDefault();
                  }
                }}
                disabled={disabled}
                className="text-center h-9 text-sm placeholder:text-muted-foreground/60"
                pattern="[0-9]*[.,]?[0-9]*"
                inputMode="decimal"
              />
            </div>
            <div className="w-20">
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
          </div>

          {/* Bottom row: Ingredient name and Notes - responsive layout */}
          <div className="flex flex-col lg:flex-row gap-2">
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
                className="h-9 text-sm placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="lg:w-48">
              <Input
                placeholder={t("notesPlaceholder")}
                value={ingredient.notes || ""}
                onChange={(e) =>
                  onUpdate(ingredient.id, {
                    notes: e.target.value,
                  })
                }
                disabled={disabled}
                className="h-9 text-sm placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        {/* Right side: Delete button */}
        <div className="shrink-0">
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
    </div>
  );
}
