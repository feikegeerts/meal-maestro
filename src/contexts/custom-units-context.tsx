"use client";

import React, { createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomUnit, UnitSystem } from "@/types/recipe";
import { createUnitSystem } from "@/lib/recipe-utils";

interface CustomUnitsContextValue {
  customUnits: CustomUnit[];
  unitSystem: UnitSystem;
  isLoading: boolean;
  error: string | null;
  addCustomUnit: (unitName: string) => Promise<boolean>;
  removeCustomUnit: (unitId: string) => Promise<boolean>;
  refreshUnits: () => Promise<void>;
}

const CustomUnitsContext = createContext<CustomUnitsContextValue | null>(null);

const CUSTOM_UNITS_KEY = ["custom-units"] as const;

export function CustomUnitsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  const { data: customUnits = [], isLoading, error: queryError } = useQuery<CustomUnit[]>({
    queryKey: CUSTOM_UNITS_KEY,
    queryFn: async () => {
      const response = await fetch("/api/custom-units");
      if (!response.ok) {
        if (response.status === 401) return [];
        throw new Error(`Failed to fetch custom units: ${response.statusText}`);
      }
      const data = await response.json();
      return Array.isArray(data.units) ? data.units : [];
    },
    staleTime: Infinity,
  });

  const addMutation = useMutation({
    mutationFn: async (unitName: string): Promise<CustomUnit> => {
      const response = await fetch("/api/custom-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit_name: unitName }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to create custom unit: ${response.statusText}`,
        );
      }
      return response.json();
    },
    onSuccess: (newUnit) => {
      queryClient.setQueryData<CustomUnit[]>(CUSTOM_UNITS_KEY, (prev = []) =>
        [...prev, newUnit].sort((a, b) => a.unit_name.localeCompare(b.unit_name)),
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (unitId: string): Promise<void> => {
      const response = await fetch(`/api/custom-units/${unitId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to delete custom unit: ${response.statusText}`,
        );
      }
    },
    onSuccess: (_, unitId) => {
      queryClient.setQueryData<CustomUnit[]>(CUSTOM_UNITS_KEY, (prev = []) =>
        prev.filter((unit) => unit.id !== unitId),
      );
    },
  });

  const addCustomUnit = async (unitName: string): Promise<boolean> => {
    try {
      await addMutation.mutateAsync(unitName);
      return true;
    } catch {
      return false;
    }
  };

  const removeCustomUnit = async (unitId: string): Promise<boolean> => {
    try {
      await removeMutation.mutateAsync(unitId);
      return true;
    } catch {
      return false;
    }
  };

  const refreshUnits = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: CUSTOM_UNITS_KEY });
  };

  const unitSystem = createUnitSystem(customUnits.map((unit) => unit.unit_name));

  const error =
    addMutation.error instanceof Error
      ? addMutation.error.message
      : removeMutation.error instanceof Error
        ? removeMutation.error.message
        : queryError instanceof Error
          ? queryError.message
          : null;

  const value: CustomUnitsContextValue = {
    customUnits,
    unitSystem,
    isLoading,
    error,
    addCustomUnit,
    removeCustomUnit,
    refreshUnits,
  };

  return (
    <CustomUnitsContext.Provider value={value}>
      {children}
    </CustomUnitsContext.Provider>
  );
}

export function useCustomUnits(): CustomUnitsContextValue {
  const context = useContext(CustomUnitsContext);
  if (!context) {
    throw new Error("useCustomUnits must be used within a CustomUnitsProvider");
  }
  return context;
}
