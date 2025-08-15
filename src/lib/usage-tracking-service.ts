import { createClient } from '@supabase/supabase-js';
import { pricingService } from './pricing-service';
import { type OpenAIUsageData } from './openai-service';

// Supabase client for usage logging
const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface UsageLogEntry {
  user_id: string;
  endpoint: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  tokens_used: number;
  calculated_cost: number;
  timestamp?: string;
}

export interface UsageStats {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  averageTokensPerCall: number;
  averageCostPerCall: number;
  mostUsedModel: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface UserUsageStats extends UsageStats {
  userId: string;
  rank?: number; // User's rank by usage
  isOutlier?: boolean; // Whether this user is an outlier
}

export class UsageTrackingService {
  
  public async logUsage(
    userId: string,
    endpoint: string,
    usage: OpenAIUsageData,
    tier: 'standard' | 'batch' | 'flex' | 'priority' = 'standard'
  ): Promise<{ success: boolean; cost?: number; error?: string }> {
    try {
      // Calculate cost using the pricing service
      const costCalculation = pricingService.calculateCost(
        usage.model,
        usage.promptTokens,
        usage.completionTokens,
        tier
      );

      // Prepare log entry
      const logEntry: UsageLogEntry = {
        user_id: userId,
        endpoint,
        model: usage.model,
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        tokens_used: usage.totalTokens,
        calculated_cost: costCalculation.totalCost,
      };

      // Insert into database
      const { error } = await supabase
        .from('api_usage')
        .insert(logEntry);

      if (error) {
        console.error('🔴 [UsageTracking] Database error:', error);
        return { success: false, error: error.message };
      }

      console.log(`🟢 [UsageTracking] Logged usage for user ${userId}: ${usage.totalTokens} tokens, $${costCalculation.totalCost.toFixed(6)}`);
      
      return { 
        success: true, 
        cost: costCalculation.totalCost 
      };

    } catch (error) {
      console.error('🔴 [UsageTracking] Error logging usage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const usageTrackingService = new UsageTrackingService();