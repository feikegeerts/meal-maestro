import { db } from "@/db";
import { apiUsage } from "@/db/schema";
import { pricingService } from "./pricing-service";
import { type OpenAIUsageData } from "./openai-service";
import { usageLimitService } from "./usage-limit-service";

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
    tier: "standard" | "batch" | "flex" | "priority" = "standard",
  ): Promise<{
    success: boolean;
    cost?: number;
    warningThresholdReached?: boolean;
    limitReached?: boolean;
    summary?: {
      totalCost: number;
      monthStart: string;
    };
    error?: string;
  }> {
    try {
      // Calculate cost using the pricing service
      const costCalculation = pricingService.calculateCost(
        usage.model,
        usage.promptTokens,
        usage.completionTokens,
        tier,
      );

      // Insert into database
      await db.insert(apiUsage).values({
        userId,
        endpoint,
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        tokensUsed: usage.totalTokens,
        calculatedCost: costCalculation.totalCost.toString(),
      });

      let warningThresholdReached = false;
      let limitReached = false;

      let summary;
      try {
        const result = await usageLimitService.recordUsageEvent(
          userId,
          usage,
          {
            endpoint,
            costUsd: costCalculation.totalCost,
          },
        );

        warningThresholdReached = result.reachedWarning;
        limitReached = result.reachedLimit;
        summary = {
          totalCost: result.summary.total_cost,
          monthStart: result.summary.month_start,
        };
      } catch (aggregationError) {
        console.error(
          "🔴 [UsageTracking] Failed to aggregate monthly usage:",
          aggregationError,
        );
      }

      return {
        success: true,
        cost: costCalculation.totalCost,
        warningThresholdReached,
        limitReached,
        summary,
      };
    } catch (error) {
      console.error("🔴 [UsageTracking] Error logging usage:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const usageTrackingService = new UsageTrackingService();
