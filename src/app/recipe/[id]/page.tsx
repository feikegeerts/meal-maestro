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
import { recipeService } from "@/lib/recipe-service";
import { Recipe } from "@/types/recipe";
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

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    getRecipeById,
    updateRecipe: updateRecipeInContext,
  } = useRecipes();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user && id) {
      loadRecipe();
    }
  }, [user, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecipe = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, try to get recipe from context (instant if coming from recipes list)
      const contextRecipe = getRecipeById(id as string);
      if (contextRecipe) {
        setRecipe(contextRecipe);
        setLoading(false);
        return;
      }

      // Fallback to API call if not in context (direct navigation)
      const recipeData = await recipeService.getRecipe(id as string);
      setRecipe(recipeData);
    } catch (err) {
      console.error("Error loading recipe:", err);
      setError(err instanceof Error ? err.message : "Failed to load recipe");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsEaten = async () => {
    if (!recipe) return;

    try {
      setActionLoading("eaten");
      const { recipe: updatedRecipe } = await recipeService.markRecipeAsEaten(
        recipe.id
      );
      setRecipe(updatedRecipe);
      // Update the context so recipes list shows updated data
      updateRecipeInContext(recipe.id, updatedRecipe);
    } catch (err) {
      console.error("Error marking recipe as eaten:", err);
      alert(
        err instanceof Error ? err.message : "Failed to mark recipe as eaten"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${recipe.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setActionLoading("delete");
      await recipeService.deleteRecipe(recipe.id);
      router.push("/recipes");
    } catch (err) {
      console.error("Error deleting recipe:", err);
      alert(err instanceof Error ? err.message : "Failed to delete recipe");
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header - Real Back Button */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/recipes")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Recipes
              </Button>
            </div>

            {/* Recipe Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>

                  {/* Real Action Buttons (disabled during loading) */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled>
                      <Utensils className="mr-2 h-4 w-4" />
                      Mark as Eaten
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" disabled>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Tags Section - Real Header */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Tag className="mr-2 h-5 w-5" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                </div>

                <Separator />

                {/* Ingredients Section - Real Header */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-muted rounded-full mt-2 mr-3 flex-shrink-0" />
                        <Skeleton className="h-4 w-full max-w-md" />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Instructions Section - Real Header */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Instructions</h3>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>

                <Separator />

                {/* Metadata Section - Real Icons and Labels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    <span>Created: </span>
                    <Skeleton className="h-4 w-24 ml-1" />
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Last eaten: </span>
                    <Skeleton className="h-4 w-20 ml-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!user) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Authentication Required
          </h1>
          <p className="text-muted-foreground">
            Please sign in to view recipe details.
          </p>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">😕</div>
                <h1 className="text-2xl font-bold text-foreground mb-4">
                  Recipe Not Found
                </h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/recipes")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Recipes
                  </Button>
                  <Button onClick={loadRecipe}>Try Again</Button>
                </div>
              </CardContent>
            </Card>
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
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4">🤔</div>
                <h1 className="text-2xl font-bold text-foreground mb-4">
                  Recipe Not Found
                </h1>
                <p className="text-muted-foreground mb-6">
                  The recipe you&apos;re looking for doesn&apos;t exist or you
                  don&apos;t have access to it.
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/recipes")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Recipes
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/recipes")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Recipes
            </Button>
          </div>

          {/* Recipe Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">
                    {recipe.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="capitalize">
                      <ChefHat className="mr-1 h-3 w-3" />
                      {recipe.category}
                    </Badge>
                    {recipe.season && (
                      <Badge variant="outline" className="capitalize">
                        <Calendar className="mr-1 h-3 w-3" />
                        {recipe.season}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAsEaten}
                    disabled={!!actionLoading}
                  >
                    <Utensils className="mr-2 h-4 w-4" />
                    {actionLoading === "eaten" ? "Marking..." : "Mark as Eaten"}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={!!actionLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {actionLoading === "delete" ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Tags */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Tag className="mr-2 h-5 w-5" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Ingredients */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span>{ingredient}</span>
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
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <span>Created: {formatDate(recipe.created_at)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Last eaten: {formatDate(recipe.last_eaten)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
