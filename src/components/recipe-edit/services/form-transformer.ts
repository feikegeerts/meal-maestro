import { RecipeInput } from "@/types/recipe";

export interface AIRecipeData {
  title?: string;
  description?: string;
  ingredients?: Array<{
    id?: string;
    name?: string;
    amount?: number | null;
    unit?: string | null;
    notes?: string;
  }>;
  sections?: Array<{
    id?: string;
    title?: string;
    instructions?: string;
    ingredients?: Array<{
      id?: string;
      name?: string;
      amount?: number | null;
      unit?: string | null;
      notes?: string;
    }>;
  }>;
  servings?: number;
  category?: string;
  cuisine?: string;
  diet_types?: string[];
  cooking_methods?: string[];
  dish_types?: string[];
  proteins?: string[];
  occasions?: string[];
  characteristics?: string[];
  season?: string;
}

export class FormTransformerService {
  static transformAIRecipeData(
    aiRecipeData: unknown,
    currentFormData: RecipeInput
  ): RecipeInput {
    const recipeData = aiRecipeData as AIRecipeData;

    if (!recipeData) {
      return currentFormData;
    }

    const updatedFormData: RecipeInput = {
      ...currentFormData,
      ...(recipeData.title && { title: recipeData.title }),
      ...(recipeData.description && { description: recipeData.description }),
      ...(recipeData.servings && { servings: recipeData.servings }),
      ...(recipeData.category && { category: recipeData.category }),
      ...(recipeData.cuisine && { cuisine: recipeData.cuisine }),
      ...(recipeData.diet_types && { diet_types: recipeData.diet_types }),
      ...(recipeData.cooking_methods && {
        cooking_methods: recipeData.cooking_methods,
      }),
      ...(recipeData.dish_types && { dish_types: recipeData.dish_types }),
      ...(recipeData.proteins && { proteins: recipeData.proteins }),
      ...(recipeData.occasions && { occasions: recipeData.occasions }),
      ...(recipeData.characteristics && {
        characteristics: recipeData.characteristics,
      }),
      ...(recipeData.season && { season: recipeData.season }),
    };

    if (recipeData.ingredients && recipeData.ingredients.length > 0) {
      updatedFormData.ingredients = recipeData.ingredients
        .filter((ing): ing is typeof ing & { name: string } =>
          Boolean(ing.name?.trim())
        )
        .map((ing, index) => ({
          id: ing.id || `ingredient-ai-${Date.now()}-${index}`,
          name: ing.name.trim(),
          amount: ing.amount ?? null,
          unit: ing.unit ?? null,
          notes: ing.notes ?? "",
        }));
    }

    if (recipeData.sections && recipeData.sections.length > 0) {
      const normalizedSections = recipeData.sections
        .map((section, sectionIndex) => {
          const normalizedIngredients =
            section.ingredients
              ?.filter((ing): ing is typeof ing & { name: string } =>
                Boolean(ing.name?.trim())
              )
              .map((ing, ingredientIndex) => ({
                id:
                  ing.id ||
                  `section-ingredient-ai-${Date.now()}-${sectionIndex}-${ingredientIndex}`,
                name: ing.name.trim(),
                amount: ing.amount ?? null,
                unit: ing.unit ?? null,
                notes: ing.notes ?? "",
              })) || [];

          const hasContent =
            (section.title && section.title.trim()) ||
            (section.instructions && section.instructions.trim()) ||
            normalizedIngredients.length > 0;

          if (!hasContent) return null;

          return {
            id: section.id || this.generateSectionId(sectionIndex),
            title: section.title?.trim() || `Section ${sectionIndex + 1}`,
            instructions: section.instructions || "",
            ingredients: normalizedIngredients,
          };
        })
        .filter(Boolean);

      if (normalizedSections.length > 0) {
        updatedFormData.sections = normalizedSections as NonNullable<
          typeof updatedFormData.sections
        >;

        const flattened = normalizedSections.flatMap(
          (section) => section!.ingredients
        );
        if (flattened.length > 0) {
          updatedFormData.ingredients = flattened;
        }

        if (
          (!updatedFormData.description ||
            updatedFormData.description.trim().length === 0) &&
          normalizedSections.some((s) => s?.instructions?.trim())
        ) {
          updatedFormData.description = normalizedSections
            .map((s) => s?.instructions)
            .filter(Boolean)
            .join("\n\n");
        }
      }
    }

    return updatedFormData;
  }

  static createUpdatePayload(formData: RecipeInput): Partial<RecipeInput> {
    return {
      title: formData.title,
      ingredients: formData.ingredients,
      sections: formData.sections,
      servings: formData.servings,
      reference: formData.reference,
      prep_time: formData.prep_time,
      cook_time: formData.cook_time,
      total_time: formData.total_time,
      pairing_wine: formData.pairing_wine,
      notes: formData.notes,
      description: formData.description,
      category: formData.category,
      cuisine: formData.cuisine,
      diet_types: formData.diet_types,
      cooking_methods: formData.cooking_methods,
      dish_types: formData.dish_types,
      proteins: formData.proteins,
      occasions: formData.occasions,
      characteristics: formData.characteristics,
      season: formData.season,
      nutrition: formData.nutrition,
    };
  }

  static generateIngredientId(): string {
    return `ingredient-${Date.now()}-${Math.random()}`;
  }

  static generateSectionId(index?: number): string {
    return `section-${Date.now()}-${index ?? Math.random()}`;
  }

  static scrollToFormOnMobile(layoutMode: string): void {
    if (layoutMode === "single-column" && typeof window !== "undefined") {
      setTimeout(() => {
        const formElement = document.querySelector("[data-form-start]");
        if (formElement && window.innerWidth < 1024) {
          formElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    }
  }
}
