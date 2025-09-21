"use client";

import { useState } from "react";
import { Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoRecipes, scaleRecipe, type DemoRecipe } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

interface ScalingDemoProps {
  className?: string;
}

export function ScalingDemo({ className }: ScalingDemoProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<DemoRecipe>(demoRecipes[0]);
  const [servings, setServings] = useState(selectedRecipe.servings);

  const scaledRecipe = scaleRecipe(selectedRecipe, servings);

  const adjustServings = (delta: number) => {
    const newServings = Math.max(1, servings + delta);
    setServings(newServings);
  };

  const handleRecipeChange = (recipe: DemoRecipe) => {
    setSelectedRecipe(recipe);
    setServings(recipe.servings);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Recipe Selector */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Select Recipe:</h4>
        <div className="grid grid-cols-2 gap-2">
          {demoRecipes.slice(0, 4).map((recipe) => (
            <Button
              key={recipe.id}
              variant={selectedRecipe.id === recipe.id ? "default" : "outline"}
              size="sm"
              className="text-xs h-auto py-2 px-3"
              onClick={() => handleRecipeChange(recipe)}
            >
              {recipe.title}
            </Button>
          ))}
        </div>
      </div>

      {/* Serving Size Adjuster */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Serving Size:</h4>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => adjustServings(-1)}
              disabled={servings <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>

            <div className="flex items-center space-x-1 bg-muted/20 rounded px-3 py-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={servings}
                onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 h-6 text-center border-0 bg-transparent p-0 text-sm"
                min="1"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => adjustServings(1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {servings !== selectedRecipe.servings && (
          <div className="text-xs text-muted-foreground">
            Scaled from original {selectedRecipe.servings} servings
          </div>
        )}
      </div>

      {/* Scaled Ingredients */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Ingredients:</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {scaledRecipe.ingredients.map((ingredient, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 px-3 bg-muted/10 rounded text-sm"
            >
              <span className="text-foreground">{ingredient.name}</span>
              <span className="text-muted-foreground font-mono">
                {ingredient.amount} {ingredient.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/20">
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">{scaledRecipe.prepTime}</div>
          <div className="text-xs text-muted-foreground">Prep min</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">{scaledRecipe.cookTime}</div>
          <div className="text-xs text-muted-foreground">Cook min</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">{scaledRecipe.difficulty}</div>
          <div className="text-xs text-muted-foreground">Level</div>
        </div>
      </div>
    </div>
  );
}