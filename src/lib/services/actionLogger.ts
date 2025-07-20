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

/**
 * Log API usage to track OpenAI costs and token usage
 */
export async function logApiUsage(
  supabaseClient: SupabaseClient,
  endpoint: string,
  tokensUsed: number,
  costUsd: number
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('api_usage')
      .insert([{
        endpoint,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
      }]);

    if (error) {
      console.error('Failed to log API usage:', error);
      // Don't throw error to prevent API usage logging from breaking main functionality
    }
  } catch (err) {
    console.error('Error logging API usage:', err);
    // Don't throw error to prevent API usage logging from breaking main functionality
  }
}

/**
 * Get API usage statistics
 */
export async function getApiUsageStats(
  supabaseClient: SupabaseClient,
  timeframe: 'day' | 'week' | 'month' = 'day'
): Promise<{
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageCostPerRequest: number;
}> {
  try {
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const { data: usage, error } = await supabaseClient
      .from('api_usage')
      .select('tokens_used, cost_usd')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', now.toISOString());

    if (error) {
      console.error('Failed to fetch API usage stats:', error);
      return { totalTokens: 0, totalCost: 0, requestCount: 0, averageCostPerRequest: 0 };
    }

    const totalTokens = usage?.reduce((sum, record) => sum + (record.tokens_used || 0), 0) || 0;
    const totalCost = usage?.reduce((sum, record) => sum + (record.cost_usd || 0), 0) || 0;
    const requestCount = usage?.length || 0;
    const averageCostPerRequest = requestCount > 0 ? totalCost / requestCount : 0;

    return {
      totalTokens,
      totalCost,
      requestCount,
      averageCostPerRequest
    };
  } catch (err) {
    console.error('Error getting API usage stats:', err);
    return { totalTokens: 0, totalCost: 0, requestCount: 0, averageCostPerRequest: 0 };
  }
}