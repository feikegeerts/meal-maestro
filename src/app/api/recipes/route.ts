import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { Recipe, RecipesResponse } from "@/types/recipe";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('query') || undefined;
    const category = searchParams.get('category') || undefined;
    const season = searchParams.get('season') || undefined;
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    let supabaseQuery = supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category);
    }

    if (season) {
      supabaseQuery = supabaseQuery.eq('season', season);
    }

    if (tags && tags.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('tags', tags);
    }

    if (query) {
      supabaseQuery = supabaseQuery.or(
        `title.ilike.%${query}%,description.ilike.%${query}%,ingredients.cs.{${query}}`
      );
    }

    const { data: recipes, error } = await supabaseQuery;

    if (error) {
      console.error('Error fetching recipes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recipes', details: error.message },
        { status: 500 }
      );
    }

    const response: RecipesResponse = {
      recipes: (recipes || []) as unknown as Recipe[],
      total: recipes?.length || 0
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in recipes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  
  try {
    const body = await request.json();
    const { title, ingredients, servings, description, category, tags, season } = body;

    if (!title || !ingredients || !description || !category || !servings) {
      return NextResponse.json(
        { error: 'Missing required fields: title, ingredients, servings, description, category' },
        { status: 400 }
      );
    }

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

    const insertData = {
      title,
      ingredients,
      servings: parseInt(servings),
      description,
      category,
      tags: tags || [],
      season,
      user_id: user.id
    };

    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating recipe:', error);
      return NextResponse.json(
        { error: 'Failed to create recipe', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ recipe, success: true }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in recipe creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}