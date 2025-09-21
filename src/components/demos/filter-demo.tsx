"use client";

import { useState, useEffect } from "react";
import { Search, X, Clock, ChefHat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  demoRecipes,
  searchRecipes,
  getAllTags,
  getAllCategories,
  type DemoRecipe,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

interface FilterDemoProps {
  className?: string;
}

export function FilterDemo({ className }: FilterDemoProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [filteredRecipes, setFilteredRecipes] =
    useState<DemoRecipe[]>(demoRecipes);

  const allTags = getAllTags();
  const allCategories = getAllCategories();

  useEffect(() => {
    let results = demoRecipes;

    // Apply search filter
    if (searchQuery) {
      results = searchRecipes(searchQuery);
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      results = results.filter((recipe) =>
        selectedTags.every((tag) =>
          recipe.tags.some((recipeTag) =>
            recipeTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    // Apply category filter
    if (selectedCategory) {
      results = results.filter(
        (recipe) =>
          recipe.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    setFilteredRecipes(results);
  }, [searchQuery, selectedTags, selectedCategory]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedCategory("");
  };

  const hasActiveFilters =
    searchQuery || selectedTags.length > 0 || selectedCategory;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-muted-foreground">
          Categories:
        </h5>
        <div className="flex flex-wrap gap-1">
          {allCategories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                setSelectedCategory((prev) =>
                  prev === category ? "" : category
                )
              }
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Tag Filter */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-muted-foreground">Tags:</h5>
        <div className="flex flex-wrap gap-1">
          {allTags.slice(0, 6).map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer text-xs h-6"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {filteredRecipes.length} of {demoRecipes.length} recipes
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={clearFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Results */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recipes found</p>
          </div>
        ) : (
          filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="p-3 bg-muted/10 rounded border border-border/20 hover:border-border/40 transition-colors"
            >
              <div className="flex justify-between items-start mb-1">
                <h6 className="font-medium text-sm text-foreground line-clamp-1">
                  {recipe.title}
                </h6>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{recipe.prepTime + recipe.cookTime}m</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                {recipe.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {recipe.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs h-5">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
