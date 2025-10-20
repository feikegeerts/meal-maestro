"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/contexts/recipe-context";
import { CustomUnitsProvider } from "@/contexts/custom-units-context";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageHeader } from "@/components/ui/page-header";
import { Recipe, RecipeInput, RecipeCategory, RecipeSeason, RecipeIngredient } from "@/types/recipe";
import { RecipeEditForm } from "@/components/recipe-edit-form";
import { recipeService } from "@/lib/recipe-service";
import { useTranslations, useLocale } from 'next-intl';
import { createConversationStore, SHARED_BUILDER_CONVERSATION_ID } from "@/lib/conversation-store";

const generateIngredientId = () => `ingredient-${Date.now()}-${Math.random()}`;
const DRAFT_STORAGE_KEY = "mm.newRecipeDraft";

const defaultRecipe: Recipe = {
  id: "",
  title: "",
  ingredients: [{
    id: generateIngredientId(),
    name: "",
    amount: null,
    unit: null,
    notes: ""
  }],
  servings: 4,
  description: "",
  category: RecipeCategory.MAIN_COURSE,
  season: RecipeSeason.YEAR_ROUND,
  last_eaten: undefined,
  created_at: undefined,
  updated_at: undefined,
  user_id: "",
  nutrition: null,
};

export default function AddRecipePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addRecipe } = useRecipes();
  const [loading, setLoading] = useState(false);
  const t = useTranslations('recipes');
  const locale = useLocale();
  const conversationStore = useMemo(
    () => createConversationStore({ userId: user?.id ?? null, locale }),
    [user?.id, locale]
  );
  const conversationId = SHARED_BUILDER_CONVERSATION_ID;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
  }, [user, authLoading, router]);

  // Support prefilled draft passed via sessionStorage from /inspire
  type StoredDraft = Partial<RecipeInput> & {
    ingredients?: Array<Partial<RecipeIngredient>>;
  };

  const initialRecipe = useMemo<Recipe>(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return defaultRecipe;
      const draft = JSON.parse(raw) as StoredDraft;
      const category = typeof draft.category === "string" ? (draft.category as RecipeCategory) : defaultRecipe.category;
      const season = typeof draft.season === "string" ? (draft.season as RecipeSeason) : defaultRecipe.season;

      return {
        ...defaultRecipe,
        title: draft.title || "",
        ingredients: (draft.ingredients || []).map((ing) => ({
          id: generateIngredientId(),
          name: ing?.name || "",
          amount: ing?.amount ?? null,
          unit: ing?.unit ?? null,
          notes: ing?.notes || "",
        })),
        servings: draft.servings || 4,
        description: draft.description || "",
        category,
        season,
        nutrition: null,
      } as Recipe;
    } catch {
      return defaultRecipe;
    }
  }, []);

  const handleSave = async (recipeData: Partial<RecipeInput>) => {
    setLoading(true);
    
    try {
      const createData: Omit<RecipeInput, 'id'> = {
        title: recipeData.title!,
        ingredients: recipeData.ingredients!,
        servings: recipeData.servings!,
        description: recipeData.description!,
        category: recipeData.category!,
        cuisine: recipeData.cuisine,
        diet_types: recipeData.diet_types || [],
        cooking_methods: recipeData.cooking_methods || [],
        dish_types: recipeData.dish_types || [],
        proteins: recipeData.proteins || [],
        occasions: recipeData.occasions || [],
        characteristics: recipeData.characteristics || [],
        season: recipeData.season,
      };

      const { recipe: newRecipe } = await recipeService.createRecipe(createData);
      
      // Add the new recipe to context
      addRecipe(newRecipe);
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      
      // Navigate to the newly created recipe's detail page
      router.push(`/recipes/${newRecipe.id}`);
    } catch (error) {
      console.error("Failed to create recipe:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    router.push("/recipes");
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return null;
  }

  return (
    <CustomUnitsProvider>
      <PageWrapper>
        <PageHeader
          title={t('addNewRecipe')}
          subtitle={t('createNewRecipe')}
          backButtonText={t('backToRecipes')}
          onBackClick={handleCancel}
          className="mb-6"
        />

        {/* Two-column layout for desktop, single column for mobile */}
        <RecipeEditForm
          recipe={initialRecipe}
          onSave={handleSave}
          loading={loading}
          includeChat={true}
          standalone={true}
          onCancel={handleCancel}
          layoutMode="two-column"
          conversationId={conversationId}
          conversationStore={conversationStore}
          conversationGreetingContext="recipe-builder"
          showNutrition={false}
        />
      </PageWrapper>
    </CustomUnitsProvider>
  );
}
