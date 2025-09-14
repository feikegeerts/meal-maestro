import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCustomUnits } from "@/hooks/use-custom-units";
// Standard cooking units - could be derived from translation keys in the future
const STANDARD_COOKING_UNITS = ["g", "kg", "ml", "l", "tbsp", "tsp", "clove"];

interface UnitSelectProps {
  value: string | null;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function UnitSelect({
  value,
  onValueChange,
  disabled = false,
  placeholder = "-",
  className,
}: UnitSelectProps) {
  const t = useTranslations("unitSelect");
  const tUnits = useTranslations("units");
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [newUnitInput, setNewUnitInput] = React.useState("");
  const [isAddingUnit, setIsAddingUnit] = React.useState(false);
  const [deletingUnit, setDeletingUnit] = React.useState<string | null>(null);

  const { customUnits, addCustomUnit, removeCustomUnit, error, isLoading } =
    useCustomUnits();

  // Fallback to standard units if custom units fail to load
  const safeCustomUnits = React.useMemo(() => {
    return Array.isArray(customUnits) ? customUnits : [];
  }, [customUnits]);

  const handleAddCustomUnit = async () => {
    if (!newUnitInput.trim()) return;

    setIsAddingUnit(true);
    const success = await addCustomUnit(newUnitInput.trim());

    if (success) {
      onValueChange(newUnitInput.trim());
      setNewUnitInput("");
      setShowAddDialog(false);
    }

    setIsAddingUnit(false);
  };

  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === "add_custom") {
      setShowAddDialog(true);
    } else {
      onValueChange(selectedValue);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    setDeletingUnit(unitId);

    await removeCustomUnit(unitId);

    setDeletingUnit(null);
  };

  // Avoid hydration issues by not rendering until we have initial data
  if (isLoading) {
    // During loading, we need to include the current value if it's not a standard unit
    // This handles the case where a recipe has a custom unit that hasn't loaded yet
    const isCustomUnit = value && !STANDARD_COOKING_UNITS.includes(value);

    return (
      <Select value={value || "none"} onValueChange={() => {}} disabled={true}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{placeholder}</SelectItem>
          {STANDARD_COOKING_UNITS.map((unit) => (
            <SelectItem key={unit} value={unit}>
              <span className="font-medium">{tUnits(unit) || unit}</span>
            </SelectItem>
          ))}
          {isCustomUnit && (
            <SelectItem key={value} value={value}>
              <span>{value}</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <Select
        value={value || "none"}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {/* None option */}
          <SelectItem value="none">{placeholder}</SelectItem>

          {/* Standard units */}
          {STANDARD_COOKING_UNITS.map((unit) => (
            <SelectItem key={unit} value={unit}>
              <span className="font-medium">{tUnits(unit) || unit}</span>
            </SelectItem>
          ))}

          {/* Custom units */}
          {safeCustomUnits.length > 0 && (
            <>
              {safeCustomUnits.map((unit) => (
                <SelectItem
                  key={unit.id}
                  value={unit.unit_name}
                  className="group relative pr-10"
                  onSelect={(e) => {
                    // Check if the click was on the delete button
                    const target = e.target as HTMLElement;
                    const deleteButton = target.closest("[data-delete-button]");
                    if (deleteButton) {
                      e.preventDefault();
                      return;
                    }
                  }}
                >
                  {unit.unit_name}
                  <button
                    type="button"
                    data-delete-button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      // Show confirmation dialog
                      const confirmed = confirm(
                        t("confirmDeleteUnit", { unit: unit.unit_name })
                      );
                      if (confirmed) {
                        handleDeleteUnit(unit.id);
                      }
                    }}
                    disabled={deletingUnit === unit.id}
                    className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 p-3 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity rounded flex items-center justify-center shrink-0 z-10"
                  >
                    {deletingUnit === unit.id ? (
                      <div className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                    ) : (
                      <Trash2 className="h-2 w-2" />
                    )}
                  </button>
                </SelectItem>
              ))}
            </>
          )}

          {/* Add custom unit option */}
          <SelectItem value="add_custom">
            <div className="flex items-center text-primary">
              <Plus className="h-3 w-3 mr-1" />
              {t("addCustomUnit")}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Add custom unit dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addCustomUnitTitle")}</DialogTitle>
            <DialogDescription>
              {t("addCustomUnitDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t("enterUnitName")}
              value={newUnitInput}
              onChange={(e) => setNewUnitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddCustomUnit();
                }
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewUnitInput("");
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleAddCustomUnit}
              disabled={!newUnitInput.trim() || isAddingUnit}
            >
              {isAddingUnit ? t("adding") : t("addUnit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
