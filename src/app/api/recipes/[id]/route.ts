import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { Recipe, RecipeIngredient, RecipeSection } from "@/types/recipe";
import { ImageService } from "@/lib/image-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  
  try {
    const { id: recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching recipe:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recipe', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ recipe: recipe as unknown as Recipe });
  } catch (error) {
    console.error('Unexpected error in recipe API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  
  try {
    const { id: recipeId } = await params;
    const body = await request.json();
    const { 
      title, 
      ingredients, 
      servings, 
      description, 
      category, 
      cuisine,
      diet_types,
      cooking_methods,
      dish_types,
      proteins,
      occasions,
      characteristics,
      season, 
      last_eaten,
      nutrition,
      sections,
    } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    const updateData: Partial<{
      title: string;
      ingredients: RecipeIngredient[];
      sections: RecipeSection[] | null;
      servings: number;
      description: string;
      category: string;
      cuisine: string;
      diet_types: string[];
      cooking_methods: string[];
      dish_types: string[];
      proteins: string[];
      occasions: string[];
      characteristics: string[];
      season: string;
      last_eaten: string;
      nutrition: unknown;
    }> = {};
    if (title !== undefined) updateData.title = title;
    const normalizeIngredient = (ingredient: RecipeIngredient) => {
      let normalizedUnit = ingredient.unit;
      
      // Convert common non-standard units to standard ones or remove them
      if (typeof normalizedUnit === 'string') {
        switch (normalizedUnit.toLowerCase()) {
          case 'el':
          case 'eetlepel':
            normalizedUnit = 'tbsp';
            break;
          case 'tl':
          case 'theelepel':
            normalizedUnit = 'tsp';
            break;
          case 'teen':
          case 'teentje':
          case 'teentjes':
            normalizedUnit = 'clove'; // Convert Dutch garlic clove unit to English
            break;
          case 'stuk':
          case 'stuks':
          case 'units.stuk':
          case 'pieces':
            normalizedUnit = null; // Remove unit for countable items
            break;
          default:
            // Keep valid units, set invalid ones to null
            const validUnits = ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'clove'];
            if (!validUnits.includes(normalizedUnit) && normalizedUnit !== 'naar smaak' && normalizedUnit !== 'to taste') {
              normalizedUnit = null;
            }
        }
      }
      
      return {
        ...ingredient,
        amount: ingredient.amount === 0 ? null : ingredient.amount,
        unit: normalizedUnit
      };
    };

    if (ingredients !== undefined) {
      // Validate structured ingredients
      if (!Array.isArray(ingredients)) {
        return NextResponse.json(
          { error: 'Ingredients must be an array of structured ingredient objects' },
          { status: 400 }
        );
      }
      
      for (const ingredient of ingredients) {
        if (!ingredient.id || !ingredient.name) {
          return NextResponse.json(
            { error: 'Each ingredient must have an id and name' },
            { status: 400 }
          );
        }
        // Normalize amount: treat 0 as null for "to taste" scenarios
        const normalizedAmount = ingredient.amount === 0 ? null : ingredient.amount;
        if (normalizedAmount !== null && (typeof normalizedAmount !== 'number' || normalizedAmount <= 0)) {
          return NextResponse.json(
            { error: 'Ingredient amounts must be positive numbers or null' },
            { status: 400 }
          );
        }
      }
      
      // We'll normalize ingredient amounts and units after fetching user's custom units
      // to properly validate both standard and custom units
      updateData.ingredients = ingredients.map(normalizeIngredient);
    }
    if (sections !== undefined) {
      if (!Array.isArray(sections)) {
        return NextResponse.json(
          { error: 'Sections must be an array when provided' },
          { status: 400 }
        );
      }

      const sectionErrors: string[] = [];
      const normalizedSections = sections.map((section: RecipeSection, index: number) => {
        if (!section.id) {
          sectionErrors.push(`Section ${index + 1} is missing an id`);
        }
        if (!section.title || !section.title.trim()) {
          sectionErrors.push(`Section ${index + 1} title is required`);
        }
        if (!section.instructions || !section.instructions.trim()) {
          sectionErrors.push(`Section ${index + 1} instructions are required`);
        }
        if (!Array.isArray(section.ingredients) || section.ingredients.length === 0) {
          sectionErrors.push(`Section ${index + 1} must include at least one ingredient`);
        } else {
          section.ingredients.forEach((ingredient: RecipeIngredient, ingredientIndex: number) => {
            if (!ingredient.id || !ingredient.name) {
              sectionErrors.push(
                `Section ${index + 1} ingredient ${ingredientIndex + 1} must have an id and name`
              );
            }
            const normalizedAmount = ingredient.amount === 0 ? null : ingredient.amount;
            if (
              normalizedAmount !== null &&
              (typeof normalizedAmount !== 'number' || normalizedAmount <= 0)
            ) {
              sectionErrors.push(
                `Section ${index + 1} ingredient ${ingredientIndex + 1} amounts must be positive numbers or null`
              );
            }
          });
        }

        return {
          ...section,
          title: section.title?.trim?.() ?? section.title,
          instructions: section.instructions,
          ingredients: Array.isArray(section.ingredients)
            ? section.ingredients.map((ingredient) => normalizeIngredient(ingredient))
            : [],
        };
      });

      if (sectionErrors.length > 0) {
        return NextResponse.json(
          { error: sectionErrors.join("; ") },
          { status: 400 }
        );
      }

      updateData.sections = normalizedSections;
    }
    if (servings !== undefined) {
      const servingsNum = parseInt(servings);
      if (isNaN(servingsNum) || servingsNum <= 0 || servingsNum > 100) {
        return NextResponse.json(
          { error: 'Servings must be a number between 1 and 100' },
          { status: 400 }
        );
      }
      updateData.servings = servingsNum;
    }
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (cuisine !== undefined) updateData.cuisine = cuisine;
    if (diet_types !== undefined) updateData.diet_types = diet_types;
    if (cooking_methods !== undefined) updateData.cooking_methods = cooking_methods;
    if (dish_types !== undefined) updateData.dish_types = dish_types;
    if (proteins !== undefined) updateData.proteins = proteins;
    if (occasions !== undefined) updateData.occasions = occasions;
    if (characteristics !== undefined) updateData.characteristics = characteristics;
    if (season !== undefined) updateData.season = season;
    if (last_eaten !== undefined) updateData.last_eaten = last_eaten;
    if (nutrition !== undefined) updateData.nutrition = nutrition;

    const { data: recipe, error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }
      
      console.error('Error updating recipe:', error);
      return NextResponse.json(
        { error: 'Failed to update recipe', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ recipe: recipe as unknown as Recipe, success: true });
  } catch (error) {
    console.error('Unexpected error in recipe update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  const imageService = new ImageService({ supabaseClient: supabase });
  
  try {
    const { id: recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    // First, get the recipe to check if it has an image
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select('id, image_url')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching recipe for deletion:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch recipe', details: fetchError.message },
        { status: 500 }
      );
    }

    // Delete the recipe from database first
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting recipe:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete recipe', details: deleteError.message },
        { status: 500 }
      );
    }

    // Clean up image if it exists (best effort - don't fail the deletion if this fails)
    if (recipe.image_url) {
      const imageDeleteResult = await imageService.deleteRecipeImage(recipe.image_url, user.id);
      
      if (!imageDeleteResult.success) {
        // Log the error but don't fail the recipe deletion
        console.warn('Failed to delete recipe image during cleanup:', imageDeleteResult.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in recipe deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
