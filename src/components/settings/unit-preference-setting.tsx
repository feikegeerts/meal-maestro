"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Scale } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

type UnitSystem = "precise-metric" | "traditional-metric" | "us-traditional" | "mixed";

interface UnitPreferenceSettingProps {
  initialValue?: UnitSystem;
  onPreferenceUpdate?: (preference: UnitSystem) => void;
}

export function UnitPreferenceSetting({
  initialValue = "traditional-metric",
  onPreferenceUpdate
}: UnitPreferenceSettingProps) {
  const t = useTranslations("account.settings.unitPreference");
  const { profile, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Get current preference from auth context (no API call needed)
  const selectedUnit = profile?.unit_system_preference || initialValue;

  const handleUnitChange = async (value: UnitSystem) => {
    if (!profile) return;

    setIsLoading(true);

    try {
      const success = await updateProfile({
        unit_system_preference: value,
      });

      if (success) {
        toast.success(t("updateSuccess"));
        onPreferenceUpdate?.(value);
      } else {
        throw new Error("Failed to update preferences");
      }
    } catch (error) {
      console.error("Error updating unit preference:", error);
      toast.error(t("updateError"));
    } finally {
      setIsLoading(false);
    }
  };

  const unitSystems: { value: UnitSystem; titleKey: string; descKey: string }[] = [
    {
      value: "precise-metric",
      titleKey: "preciseMetric.title",
      descKey: "preciseMetric.description",
    },
    {
      value: "traditional-metric",
      titleKey: "traditionalMetric.title",
      descKey: "traditionalMetric.description",
    },
    {
      value: "us-traditional",
      titleKey: "usTraditional.title",
      descKey: "usTraditional.description",
    },
    {
      value: "mixed",
      titleKey: "mixed.title",
      descKey: "mixed.description",
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Scale className="h-4 w-4" />
        {t("title")}
      </h3>

      <RadioGroup
        value={selectedUnit}
        onValueChange={handleUnitChange}
        disabled={isLoading}
        className="space-y-2"
      >
        {unitSystems.map((system) => (
          <div key={system.value} className="flex items-center space-x-3">
            <RadioGroupItem
              value={system.value}
              id={system.value}
              disabled={isLoading}
            />
            <div className="flex-1">
              <Label
                htmlFor={system.value}
                className={`text-sm cursor-pointer ${
                  isLoading ? "opacity-50" : ""
                }`}
              >
                <span className="font-medium">{t(system.titleKey)}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t(system.descKey)}
                </span>
              </Label>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}