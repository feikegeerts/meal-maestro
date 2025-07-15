import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { logRecipeUpdated, logRecipeDeleted } from '$lib/services/actionLogger.js';
import type { Recipe } from '$lib/types.js';

if (dev) {
  dotenv.config({ path: '.env.local' });
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. Please set them in your .env.local file.');
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

export const GET: RequestHandler = async ({ params }) => {
  try {

    const { id } = params;

    if (!id) {
      return json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
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

export const PUT: RequestHandler = async ({ request, params }) => {
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

    // Get original recipe data for logging
    const { data: originalRecipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    const { data: recipe, error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recipe:', error);
      return json({ error: 'Failed to update recipe' }, { status: 500 });
    }

    // Log the recipe update
    if (originalRecipe) {
      await logRecipeUpdated(supabase, id, originalRecipe, updateData);
    }

    return json({ recipe, success: true });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return json({ error: 'An error occurred while updating the recipe' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, params }) => {
  try {
    const { id } = params;

    // Validate required fields
    if (!id) {
      return json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    // Get recipe data before deletion for logging
    const { data: recipeToDelete, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching recipe for deletion:', fetchError);
      return json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Log the recipe deletion BEFORE actually deleting
    if (recipeToDelete) {
      await logRecipeDeleted(supabase, recipeToDelete as Recipe);
    }

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

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