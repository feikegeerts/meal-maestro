"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
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

let globalFetchPromise: Promise<CustomUnit[]> | null = null;
let globalCustomUnits: CustomUnit[] | null = null;

export function CustomUnitsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customUnits, setCustomUnits] = useState<CustomUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomUnits = useCallback(async (): Promise<CustomUnit[]> => {
    // Return cached data if available
    if (globalCustomUnits !== null) {
      return globalCustomUnits;
    }

    // Return existing promise if fetch is already in progress
    if (globalFetchPromise) {
      return globalFetchPromise;
    }

    // Create new fetch promise
    globalFetchPromise = (async () => {
      try {
        const response = await fetch("/api/custom-units");

        if (!response.ok) {
          // Don't treat auth failures as errors during initial load
          if (response.status === 401) {
            globalCustomUnits = [];
            return [];
          }
          throw new Error(
            `Failed to fetch custom units: ${response.statusText}`
          );
        }

        const data = await response.json();
        const units = Array.isArray(data.units) ? data.units : [];
        globalCustomUnits = units;
        return units;
      } catch (err) {
        console.warn("Failed to fetch custom units:", err);
        globalCustomUnits = [];
        throw err;
      } finally {
        globalFetchPromise = null;
      }
    })();

    return globalFetchPromise;
  }, []);

  const loadCustomUnits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const units = await fetchCustomUnits();
      setCustomUnits(units);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch custom units"
      );
      setCustomUnits([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCustomUnits]);

  const addCustomUnit = useCallback(
    async (unitName: string): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch("/api/custom-units", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ unit_name: unitName }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to create custom unit: ${response.statusText}`
          );
        }

        const newUnit = await response.json();
        const updatedUnits = [...customUnits, newUnit].sort((a, b) =>
          a.unit_name.localeCompare(b.unit_name)
        );

        setCustomUnits(updatedUnits);
        globalCustomUnits = updatedUnits; // Update global cache

        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create custom unit"
        );
        return false;
      }
    },
    [customUnits]
  );

  const removeCustomUnit = useCallback(
    async (unitId: string): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch(`/api/custom-units/${unitId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(
            errorData.error ||
              `Failed to delete custom unit: ${response.statusText}`
          );
          return false;
        }

        const updatedUnits = customUnits.filter((unit) => unit.id !== unitId);
        setCustomUnits(updatedUnits);
        globalCustomUnits = updatedUnits; // Update global cache

        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete custom unit"
        );
        return false;
      }
    },
    [customUnits]
  );

  const refreshUnits = useCallback(async () => {
    // Clear cache and reload
    globalCustomUnits = null;
    globalFetchPromise = null;
    await loadCustomUnits();
  }, [loadCustomUnits]);

  // Load custom units on mount
  useEffect(() => {
    loadCustomUnits();
  }, [loadCustomUnits]);

  // Create unit system from current custom units
  const unitSystem = createUnitSystem(
    customUnits.map((unit) => unit.unit_name)
  );

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
