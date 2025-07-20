import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/services/auth.js';
import { validateRecipeInput, isValidCategory, isValidSeason, isValidTag } from '$lib/services/recipeFunctions.js';
import { RECIPE_CATEGORIES, RECIPE_SEASONS, RECIPE_TAGS } from '$lib/types';


export const GET: RequestHandler = async (event) => {
  // Require authentication
  const authResult = await requireAuth(event);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const { user, client: supabase } = authResult;
  const { url } = event;
  
  try {
    // Get query parameters for filtering
    const category = url.searchParams.get('category');
    const season = url.searchParams.get('season');
    const tags = url.searchParams.get('tags');

    // Validate filter parameters
    if (category && !isValidCategory(category)) {
      return json({ error: `Invalid category. Must be one of: ${RECIPE_CATEGORIES.join(', ')}` }, { status: 400 });
    }
    if (season && !isValidSeason(season)) {
      return json({ error: `Invalid season. Must be one of: ${RECIPE_SEASONS.join(', ')}` }, { status: 400 });
    }
    if (tags) {
      const tagArray = tags.split(',');
      const invalidTags = tagArray.filter(tag => !isValidTag(tag));
      if (invalidTags.length > 0) {
        return json({ error: `Invalid tags: ${invalidTags.join(', ')}. Available tags: ${RECIPE_TAGS.join(', ')}` }, { status: 400 });
      }
    }

    let query = supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (category) {
      query = query.eq('category', category);
    }
    if (season) {
      query = query.eq('season', season);
    }
    if (tags) {
      query = query.contains('tags', tags.split(','));
    }

    const { data: recipes, error } = await query;

    if (error) {
      console.error('Error fetching recipes:', error);
      return json({ error: 'Failed to fetch recipes' }, { status: 500 });
    }

    // Log the search action
    const searchQuery = url.searchParams.get('q') || '';
    const filters = { category, season, tags };

    return json({ recipes: recipes || [] });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return json({ error: 'An error occurred while fetching recipes' }, { status: 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  // Require authentication
  const authResult = await requireAuth(event);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const { user, client: supabase } = authResult;
  
  try {
    const requestData = await event.request.json();
    const { title, ingredients, description, category, tags, season } = requestData;

    // Validate required fields
    if (!title || !ingredients || !description || !category) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate recipe input using our validation function
    const validation = validateRecipeInput({
      title,
      ingredients,
      description,
      category,
      tags: tags || [],
      season
    });

    if (!validation.valid) {
      return json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert([{
        title,
        ingredients,
        description,
        category,
        tags: tags || [],
        season,
        user_id: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating recipe:', error);
      return json({ error: 'Failed to create recipe' }, { status: 500 });
    }

    return json({ recipe, success: true });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return json({ error: 'An error occurred while creating the recipe' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async (event) => {
  // Require authentication
  const authResult = await requireAuth(event);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const { user, client: supabase } = authResult;
  
  try {
    const requestData = await event.request.json();
    const { id, title, ingredients, description, category, tags, season, last_eaten } = requestData;

    // Validate required fields
    if (!id) {
      return json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    // Validate only the fields being updated
    if (category && !isValidCategory(category)) {
      return json({ error: `Invalid category "${category}". Must be one of: ${RECIPE_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    if (season && !isValidSeason(season)) {
      return json({ error: `Invalid season "${season}". Must be one of: ${RECIPE_SEASONS.join(', ')}` }, { status: 400 });
    }

    if (tags) {
      const invalidTags = tags.filter((tag: string) => !isValidTag(tag));
      if (invalidTags.length > 0) {
        return json({ error: `Invalid tags: ${invalidTags.join(', ')}. Available tags: ${RECIPE_TAGS.join(', ')}` }, { status: 400 });
      }
    }

    const updateData: any = { updated_at: new Date() };
    if (title) updateData.title = title;
    if (ingredients) updateData.ingredients = ingredients;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags;
    if (season) updateData.season = season;
    if (last_eaten) updateData.last_eaten = last_eaten;

    // Get original recipe data for logging and verify ownership
    const { data: originalRecipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (!originalRecipe) {
      return json({ error: 'Recipe not found or access denied' }, { status: 404 });
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recipe:', error);
      return json({ error: 'Failed to update recipe' }, { status: 500 });
    }

    return json({ recipe, success: true });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return json({ error: 'An error occurred while updating the recipe' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async (event) => {
  // Require authentication
  const authResult = await requireAuth(event);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const { user, client: supabase } = authResult;
  
  try {
    const requestData = await event.request.json();
    const { id } = requestData;

    // Validate required fields
    if (!id) {
      return json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    // Get recipe data before deletion and verify ownership
    const { data: recipeToDelete, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching recipe for deletion:', fetchError);
      return json({ error: 'Recipe not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting recipe:', error);
      return json({ error: 'Failed to delete recipe' }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return json({ error: 'An error occurred while deleting the recipe' }, { status: 500 });
  }
};