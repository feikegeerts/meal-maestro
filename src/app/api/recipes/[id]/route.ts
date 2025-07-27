import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { Recipe, RecipeIngredient } from "@/types/recipe";

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
    const { title, ingredients, servings, description, category, tags, season, last_eaten } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    const updateData: Partial<{
      title: string;
      ingredients: RecipeIngredient[];
      servings: number;
      description: string;
      category: string;
      tags: string[];
      season: string;
      last_eaten: string;
    }> = {};
    if (title !== undefined) updateData.title = title;
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
        if (ingredient.amount !== null && (typeof ingredient.amount !== 'number' || ingredient.amount <= 0)) {
          return NextResponse.json(
            { error: 'Ingredient amounts must be positive numbers or null' },
            { status: 400 }
          );
        }
      }
      
      updateData.ingredients = ingredients;
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
    if (tags !== undefined) updateData.tags = tags;
    if (season !== undefined) updateData.season = season;
    if (last_eaten !== undefined) updateData.last_eaten = last_eaten;

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
  
  try {
    const { id: recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting recipe:', error);
      return NextResponse.json(
        { error: 'Failed to delete recipe', details: error.message },
        { status: 500 }
      );
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