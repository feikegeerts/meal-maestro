"use client";

import { useState } from "react";
import {
  Recipe,
  scaleRecipe,
  formatIngredientDisplay,
} from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, Users, Calculator } from "lucide-react";

interface ServingSizeSelectorProps {
  recipe: Recipe;
  onServingChange?: (newServings: number, scaledRecipe: Recipe) => void;
  showPreview?: boolean;
  disabled?: boolean;
}

export function ServingSizeSelector({
  recipe,
  onServingChange,
  showPreview = true,
  disabled = false,
}: ServingSizeSelectorProps) {
  const [currentServings, setCurrentServings] = useState(recipe.servings);

  const scaledRecipe = scaleRecipe(recipe, currentServings);
  const scalingRatio = currentServings / recipe.servings;

  const handleServingChange = (newServings: number) => {
    if (newServings < 1 || newServings > 100) return;

    setCurrentServings(newServings);
    const newScaledRecipe = scaleRecipe(recipe, newServings);
    onServingChange?.(newServings, newScaledRecipe);
  };


  const incrementServing = () => {
    if (currentServings < 100) {
      handleServingChange(currentServings + 1);
    }
  };

  const decrementServing = () => {
    if (currentServings > 1) {
      handleServingChange(currentServings - 1);
    }
  };

  const resetToOriginal = () => {
    handleServingChange(recipe.servings);
  };

  const isScaled = currentServings !== recipe.servings;

  return (
    <div className="space-y-3">
      {/* Compact Serving Size Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Recipe serves:</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={decrementServing}
              disabled={disabled || currentServings <= 1}
              className="h-8 w-8 p-0 rounded-r-none border-r hover:bg-muted"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <div className="px-3 py-1 text-sm font-medium min-w-[3rem] text-center">
              {currentServings}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={incrementServing}
              disabled={disabled || currentServings >= 24}
              className="h-8 w-8 p-0 rounded-l-none border-l hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">people</span>
        </div>
      </div>

      {/* Compact Scaling Info */}
      {isScaled && (
        <div className="flex items-center justify-between text-xs bg-muted/50 rounded px-3 py-2">
          <div className="flex items-center gap-1">
            <Calculator className="h-3 w-3 text-muted-foreground" />
            <span>
              Scaling from <strong>{recipe.servings}</strong> to{" "}
              <strong>{currentServings}</strong> people
              {scalingRatio !== 1 && (
                <span className="text-muted-foreground ml-1">
                  (×{scalingRatio.toFixed(2)})
                </span>
              )}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetToOriginal}
            disabled={disabled}
            className="h-5 px-2 text-xs"
          >
            Reset
          </Button>
        </div>
      )}

      {/* Scaled Ingredients Preview */}
      {showPreview && isScaled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Scaled Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Ingredients */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Original ({recipe.servings} people)
                  </h4>
                  <ul className="space-y-1">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-sm flex items-start">
                        <span className="inline-block w-1.5 h-1.5 bg-muted-foreground rounded-full mt-2 mr-2 flex-shrink-0" />
                        <span className="opacity-60">
                          {formatIngredientDisplay(ingredient)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Scaled Ingredients */}
                <div>
                  <h4 className="font-medium text-sm text-primary mb-2">
                    Scaled ({currentServings} people)
                  </h4>
                  <ul className="space-y-1">
                    {scaledRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-sm flex items-start">
                        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-2 flex-shrink-0" />
                        <span className="font-medium">
                          {formatIngredientDisplay(ingredient)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
