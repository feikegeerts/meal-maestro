"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/contexts/recipe-context";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Recipe, formatIngredientDisplay } from "@/types/recipe";
import { ServingSizeSelector } from "@/components/serving-size-selector";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Utensils,
  Clock,
  Calendar,
  CalendarDays,
  Tag,
  ChefHat,
} from "lucide-react";
import { setRedirectUrl } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RecipeEditForm, triggerAutoSave } from "@/components/recipe-edit-form";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { getRecipeById, updateRecipe: updateRecipeInContext } = useRecipes();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [displayRecipe, setDisplayRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      setRedirectUrl(`/recipes/${id}`);
      router.push("/");
      return;
    }
  }, [user, authLoading, router, id]);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id || typeof id !== "string") {
        setError("Invalid recipe ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try to get from context first
        const contextRecipe = getRecipeById(id);
        if (contextRecipe) {
          setRecipe(contextRecipe);
          setDisplayRecipe(contextRecipe);
          setLoading(false);
          return;
        }

        // Fallback to API call
        const response = await fetch(`/api/recipes/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Recipe not found");
          } else {
            setError("Failed to load recipe");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setRecipe(data.recipe);
        setDisplayRecipe(data.recipe);
      } catch (error) {
        console.error("Error loading recipe:", error);
        setError("Failed to load recipe");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadRecipe();
    }
  }, [id, user, getRecipeById]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const handleUpdateRecipe = async (
    recipeData: Partial<import("@/types/recipe").RecipeInput>
  ) => {
    if (!recipe) return;

    setActionLoading("update");
    try {
      const updatedRecipe = await updateRecipe(recipeData);
      setRecipe(updatedRecipe);
      setDisplayRecipe(updatedRecipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      throw error; // Re-throw to let the form handle the error
    } finally {
      setActionLoading(null);
    }
  };

  const updateRecipe = async (
    updateData: Partial<import("@/types/recipe").RecipeInput>
  ) => {
    if (!recipe) throw new Error("Recipe not found");

    const response = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update recipe");
    }

    const data = await response.json();

    // Update context if available
    updateRecipeInContext?.(recipe.id, data.recipe);

    return data.recipe;
  };

  const handleMarkEaten = async () => {
    if (!recipe) return;

    setActionLoading("mark-eaten");
    try {
      const now = new Date().toISOString();
      const updatedRecipe = await updateRecipe({ last_eaten: now });
      setRecipe(updatedRecipe);
      setDisplayRecipe(updatedRecipe);
    } catch (error) {
      console.error("Error marking recipe as eaten:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!recipe || !confirm("Are you sure you want to delete this recipe?")) {
      return;
    }

    setActionLoading("delete");
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipe");
      }

      router.push("/recipes");
    } catch (error) {
      console.error("Error deleting recipe:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push("/recipes")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Recipes
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!recipe) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Separator />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper>
        <div className="container mx-auto px-4 pt-4 pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center self-start"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <div className="flex items-center justify-between sm:justify-end sm:flex-wrap gap-2">
                <Button
                  onClick={handleMarkEaten}
                  disabled={!!actionLoading}
                  variant="outline"
                  size="sm"
                >
                  {actionLoading === "mark-eaten" ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Marking...
                    </>
                  ) : (
                    <>
                      <Utensils className="mr-2 h-4 w-4" />
                      Mark as Eaten
                    </>
                  )}
                </Button>

                <Sheet
                  onOpenChange={async (open) => {
                    if (!open) {
                      // Trigger auto-save when closing
                      await triggerAutoSave();
                    }
                  }}
                >
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!actionLoading}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-3xl lg:max-w-4xl overflow-y-auto p-3 sm:p-6">
                    <SheetHeader className="px-0 pb-4">
                      <SheetTitle>Edit Recipe</SheetTitle>
                    </SheetHeader>
                    <RecipeEditForm
                      recipe={recipe}
                      onSave={handleUpdateRecipe}
                      loading={actionLoading === "update"}
                    />
                  </SheetContent>
                </Sheet>

                <Button
                  onClick={handleDelete}
                  disabled={!!actionLoading}
                  variant="destructive"
                  size="sm"
                >
                  {actionLoading === "delete" ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Recipe Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl sm:text-2xl mb-1 sm:mb-2">{recipe.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <ChefHat className="mr-1 h-4 w-4" />
                        <span className="capitalize">{recipe.category}</span>
                      </div>
                      {recipe.season && (
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          <span className="capitalize">{recipe.season}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {recipe.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Serving Size Selector */}
                {recipe && (
                  <ServingSizeSelector
                    recipe={recipe}
                    onServingChange={(newServings, scaledRecipe) => {
                      setDisplayRecipe(scaledRecipe);
                    }}
                    showPreview={false}
                  />
                )}

                <Separator />

                {/* Ingredients */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {(displayRecipe || recipe)?.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span>{formatIngredientDisplay(ingredient)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Instructions */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Instructions</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {recipe.description}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <CalendarDays className="mr-1 h-4 w-4" />
                    <span>Created: {formatDate(recipe.created_at)}</span>
                  </div>
                  <div className="flex items-center sm:justify-end">
                    <Clock className="mr-1 h-4 w-4" />
                    <span>Last eaten: {formatDate(recipe.last_eaten)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    </>
  );
}