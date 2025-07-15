import type { SupabaseClient } from '@supabase/supabase-js';
import type { Recipe } from '$lib/types.js';

// Test database connection
export async function testDatabaseConnection(supabaseClient: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient
      .from('action_logs')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Database connection test exception:', err);
    return false;
  }
}

export type ActionType = 'create' | 'update' | 'delete' | 'search';

export interface ActionLogEntry {
  id: string;
  action_type: ActionType;
  recipe_id: string | null;
  description: string;
  details: Record<string, any> | null;
  timestamp: string;
}

export interface ActionLogDetails {
  searchQuery?: string;
  filters?: Record<string, any>;
  originalData?: Partial<Recipe>;
  newData?: Partial<Recipe>;
  changedFields?: string[];
  resultCount?: number;
  error?: string;
}

/**
 * Log a database action to the action_logs table
 */
export async function logAction(
  supabaseClient: SupabaseClient,
  actionType: ActionType,
  description: string,
  recipeId?: string | null,
  details?: ActionLogDetails
): Promise<void> {
  try {
    const insertData = {
      action_type: actionType,
      recipe_id: recipeId || null,
      description,
      details: details || null,
    };

    const { error } = await supabaseClient
      .from('action_logs')
      .insert([insertData]);

    if (error) {
      console.error('Failed to log action:', error);
      // Don't throw error to prevent action logging from breaking main functionality
    }
  } catch (err) {
    console.error('Error logging action:', err);
    // Don't throw error to prevent action logging from breaking main functionality
  }
}

/**
 * Log a recipe creation action
 */
export async function logRecipeCreated(supabaseClient: SupabaseClient, recipe: Recipe): Promise<void> {
  await logAction(
    supabaseClient,
    'create',
    `Created recipe: ${recipe.title}`,
    recipe.id,
    {
      newData: recipe,
    }
  );
}

/**
 * Log a recipe update action
 */
export async function logRecipeUpdated(
  supabaseClient: SupabaseClient,
  recipeId: string,
  originalData: Partial<Recipe>,
  newData: Partial<Recipe>
): Promise<void> {
  // Determine which fields changed
  const changedFields = Object.keys(newData).filter(
    key => JSON.stringify(originalData[key as keyof Recipe]) !== JSON.stringify(newData[key as keyof Recipe])
  );

  await logAction(
    supabaseClient,
    'update',
    `Updated recipe: ${newData.title || originalData.title} (changed: ${changedFields.join(', ')})`,
    recipeId,
    {
      originalData,
      newData,
      changedFields,
    }
  );
}

/**
 * Log a recipe deletion action
 */
export async function logRecipeDeleted(supabaseClient: SupabaseClient, recipe: Recipe): Promise<void> {
  await logAction(
    supabaseClient,
    'delete',
    `Deleted recipe: ${recipe.title}`,
    recipe.id,
    {
      originalData: recipe,
    }
  );
}

/**
 * Log a recipe search action
 */
export async function logRecipeSearch(
  supabaseClient: SupabaseClient,
  searchQuery: string,
  filters: Record<string, any>,
  resultCount: number
): Promise<void> {
  await logAction(
    supabaseClient,
    'search',
    `Searched recipes: "${searchQuery}" (${resultCount} results)`,
    null,
    {
      searchQuery,
      filters,
      resultCount,
    }
  );
}

/**
 * Get recent action logs
 */
export async function getActionLogs(supabaseClient: SupabaseClient, limit: number = 50): Promise<ActionLogEntry[]> {
  const { data, error } = await supabaseClient
    .from('action_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch action logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get action logs for a specific recipe
 */
export async function getRecipeActionLogs(supabaseClient: SupabaseClient, recipeId: string): Promise<ActionLogEntry[]> {
  const { data, error } = await supabaseClient
    .from('action_logs')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Failed to fetch recipe action logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Clear old action logs (keep last 1000 entries)
 */
export async function cleanupOldLogs(supabaseClient: SupabaseClient): Promise<void> {
  try {
    // Get the timestamp of the 1000th most recent log
    const { data: recentLogs } = await supabaseClient
      .from('action_logs')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (recentLogs && recentLogs.length === 1000) {
      const cutoffTimestamp = recentLogs[999].timestamp;
      
      // Delete logs older than the cutoff
      const { error } = await supabaseClient
        .from('action_logs')
        .delete()
        .lt('timestamp', cutoffTimestamp);

      if (error) {
        console.error('Failed to cleanup old logs:', error);
      }
    }
  } catch (err) {
    console.error('Error during log cleanup:', err);
  }
}