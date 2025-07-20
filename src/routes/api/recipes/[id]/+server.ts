import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/services/auth.js';
import type { Recipe } from '$lib/types.js';


export const GET: RequestHandler = async (event) => {
  // Require authentication
  const authResult = await requireAuth(event);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const { user, client: supabase } = authResult;
  const { params } = event;
  
  try {
    const { id } = params;

    if (!id) {
      return json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching recipe:', error);
      return json({ error: 'Recipe not found' }, { status: 404 });
    }

    return json({ recipe });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return json({ error: 'An error occurred while fetching the recipe' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async (event) => {
  // Require authentication
  const authResult = await requireAuth(event);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const { user, client: supabase } = authResult;
  const { params, request } = event;
  
  try {
    const { id } = params;
    const requestData = await request.json();
    const { title, ingredients, description, category, tags, season, last_eaten } = requestData;

    // Validate required fields
    if (!id) {
      return json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    const updateData: any = { updated_at: new Date() };
    if (title) updateData.title = title;
    if (ingredients) updateData.ingredients = ingredients;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags;
    if (season) updateData.season = season;
    if (last_eaten) updateData.last_eaten = last_eaten;

    // Get original recipe data and verify ownership
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
  const { params } = event;
  
  try {
    const { id } = params;

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