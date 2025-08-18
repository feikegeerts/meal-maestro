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
    const cuisineParam = searchParams.get('cuisine');
    const dietTypesParam = searchParams.get('diet_types');
    const cookingMethodsParam = searchParams.get('cooking_methods');
    const dishTypesParam = searchParams.get('dish_types');
    const proteinsParam = searchParams.get('proteins');
    const occasionsParam = searchParams.get('occasions');
    const characteristicsParam = searchParams.get('characteristics');
    
    const cuisine = cuisineParam || undefined;
    const dietTypes = dietTypesParam ? dietTypesParam.split(',').map(t => t.trim()) : undefined;
    const cookingMethods = cookingMethodsParam ? cookingMethodsParam.split(',').map(t => t.trim()) : undefined;
    const dishTypes = dishTypesParam ? dishTypesParam.split(',').map(t => t.trim()) : undefined;
    const proteins = proteinsParam ? proteinsParam.split(',').map(t => t.trim()) : undefined;
    const occasions = occasionsParam ? occasionsParam.split(',').map(t => t.trim()) : undefined;
    const characteristics = characteristicsParam ? characteristicsParam.split(',').map(t => t.trim()) : undefined;
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

    if (cuisine) {
      supabaseQuery = supabaseQuery.eq('cuisine', cuisine);
    }

    if (dietTypes && dietTypes.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('diet_types', dietTypes);
    }

    if (cookingMethods && cookingMethods.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('cooking_methods', cookingMethods);
    }

    if (dishTypes && dishTypes.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('dish_types', dishTypes);
    }

    if (proteins && proteins.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('proteins', proteins);
    }

    if (occasions && occasions.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('occasions', occasions);
    }

    if (characteristics && characteristics.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('characteristics', characteristics);
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
      season 
    } = body;

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
      cuisine,
      diet_types: diet_types || [],
      cooking_methods: cooking_methods || [],
      dish_types: dish_types || [],
      proteins: proteins || [],
      occasions: occasions || [],
      characteristics: characteristics || [],
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

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Recipe IDs array is required' },
        { status: 400 }
      );
    }

    const { data: deletedRecipes, error } = await supabase
      .from('recipes')
      .delete()
      .eq('user_id', user.id)
      .in('id', ids)
      .select('id');

    if (error) {
      console.error('Error deleting recipes:', error);
      return NextResponse.json(
        { error: 'Failed to delete recipes', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: deletedRecipes?.length || 0,
      deletedIds: deletedRecipes?.map(r => r.id) || []
    });
  } catch (error) {
    console.error('Unexpected error in bulk delete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  
  try {
    const body = await request.json();
    const { ids, action } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Recipe IDs array is required' },
        { status: 400 }
      );
    }

    if (action === 'mark_as_eaten') {
      const { data: updatedRecipes, error } = await supabase
        .from('recipes')
        .update({ last_eaten: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', ids)
        .select('id');

      if (error) {
        console.error('Error marking recipes as eaten:', error);
        return NextResponse.json(
          { error: 'Failed to mark recipes as eaten', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        updatedCount: updatedRecipes?.length || 0,
        updatedIds: updatedRecipes?.map(r => r.id) || []
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Unexpected error in bulk update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}