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

interface MobileIngredientItemProps {
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

export function MobileIngredientItem({
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
}: MobileIngredientItemProps) {
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
      type: 'ingredient',
      ingredient,
      index
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Only log when transform starts (avoids spam)
  const windowDebug = (window as unknown) as Window & { [key: string]: boolean };
  if (transform && (transform.x !== 0 || transform.y !== 0) && !windowDebug[`logged-mobile-${ingredient.id}`]) {
    console.log("📱 MOBILE:", ingredient.name, "transform:", transform, "isDragging:", isDragging);
    windowDebug[`logged-mobile-${ingredient.id}`] = true;
  } else if (!transform || (transform.x === 0 && transform.y === 0)) {
    windowDebug[`logged-mobile-${ingredient.id}`] = false;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-muted/30 rounded-lg p-2.5"
      {...attributes}
    >
      {/* Optimized Layout */}
      <div className="space-y-2">
        {/* Row 1: Drag Handle + Index + Amount + Unit + Delete */}
        <div className="flex gap-2 items-center">
          <button
            ref={setActivatorNodeRef}
            {...listeners}
            disabled={disabled}
            className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing disabled:cursor-default disabled:hover:bg-transparent"
            type="button"
          >
            <Grip className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="text-xs font-medium text-muted-foreground w-6">
            {index + 1}.
          </span>
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
              className="text-center h-9 text-sm px-3 py-1"
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
              <SelectTrigger className="h-9 text-sm min-h-9">
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
          <div className="flex-1"></div>
          {ingredientsLength > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(ingredient.id)}
              disabled={disabled}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Row 2: Ingredient Name (full width) */}
        <div>
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

        {/* Row 3: Notes (if needed) */}
        {(ingredient.notes || !disabled) && (
          <div>
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
        )}
      </div>
    </div>
  );
}