import { createClient } from "@supabase/supabase-js";
import { type UserUsageStats, type UsageStats } from "./usage-tracking-service";

// Admin service with service role key for full database access
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin functions");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface ApiUsageRow {
  id: string;
  user_id: string;
  endpoint: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  tokens_used: number;
  calculated_cost: number;
  timestamp: string;
}

export class AdminUsageService {
  public async getTotalRecipeCount(): Promise<number> {
    try {
      console.log("🔍 [AdminUsage] Fetching total recipe count...");
      const { count, error } = await supabaseAdmin
        .from("recipes")
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error("🔴 [AdminUsage] Error fetching recipe count:", error);
        return 0;
      }

      console.log(`🔍 [AdminUsage] Total recipe count: ${count || 0}`);
      return count || 0;
    } catch (error) {
      console.error("🔴 [AdminUsage] Error in getTotalRecipeCount:", error);
      return 0;
    }
  }

  public async getAllUsersUsageStats(
    startDate?: string,
    endDate?: string
  ): Promise<UserUsageStats[]> {
    try {
      console.log("🔍 [AdminUsage] Fetching all users usage stats...", { startDate, endDate });
      let query = supabaseAdmin
        .from("api_usage")
        .select("*")
        .order("timestamp", { ascending: false });

      if (startDate) {
        query = query.gte("timestamp", startDate);
      }
      if (endDate) {
        query = query.lte("timestamp", endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("🔴 [AdminUsage] Error fetching all users stats:", error);
        return [];
      }

      console.log(`🔍 [AdminUsage] Found ${data?.length || 0} API usage records`);

      if (!data || data.length === 0) {
        return [];
      }

      // Group data by user
      const userDataMap = new Map<string, ApiUsageRow[]>();
      data.forEach((entry: ApiUsageRow) => {
        if (!userDataMap.has(entry.user_id)) {
          userDataMap.set(entry.user_id, []);
        }
        userDataMap.get(entry.user_id)!.push(entry);
      });

      // Calculate stats for each user
      const userStats: UserUsageStats[] = [];
      userDataMap.forEach((userData, userId) => {
        const stats = this.calculateStatsFromData(userData);
        userStats.push({
          userId,
          ...stats,
          dateRange: {
            start: startDate || "",
            end: endDate || "",
          },
        });
      });

      console.log(`🔍 [AdminUsage] Calculated stats for ${userStats.length} users`);

      // Sort by total cost (descending) and add ranks
      userStats.sort((a, b) => b.totalCost - a.totalCost);
      userStats.forEach((stats, index) => {
        stats.rank = index + 1;
      });

      // Detect outliers (users with >2x average usage)
      const avgCost =
        userStats.reduce((sum, s) => sum + s.totalCost, 0) / userStats.length;
      const avgTokens =
        userStats.reduce((sum, s) => sum + s.totalTokens, 0) / userStats.length;

      console.log(`🔍 [AdminUsage] Average cost: ${avgCost.toFixed(4)}, Average tokens: ${avgTokens.toFixed(0)}`);

      userStats.forEach((stats) => {
        stats.isOutlier =
          stats.totalCost > avgCost * 2 || stats.totalTokens > avgTokens * 2;
      });

      return userStats;
    } catch (error) {
      console.error("🔴 [AdminUsage] Error in getAllUsersUsageStats:", error);
      return [];
    }
  }

  public async getUserUsageStats(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<UserUsageStats | null> {
    try {
      let query = supabaseAdmin
        .from("api_usage")
        .select("*")
        .eq("user_id", userId);

      if (startDate) {
        query = query.gte("timestamp", startDate);
      }
      if (endDate) {
        query = query.lte("timestamp", endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("🔴 [AdminUsage] Error fetching user stats:", error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          userId,
          totalCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          averageTokensPerCall: 0,
          averageCostPerCall: 0,
          mostUsedModel: "",
          dateRange: {
            start: startDate || "",
            end: endDate || "",
          },
        };
      }

      const stats = this.calculateStatsFromData(data);
      return {
        userId,
        ...stats,
        dateRange: {
          start: startDate || data[data.length - 1]?.timestamp || "",
          end: endDate || data[0]?.timestamp || "",
        },
      };
    } catch (error) {
      console.error("🔴 [AdminUsage] Error in getUserUsageStats:", error);
      return null;
    }
  }

  public async getUsageByTimeRange(
    startDate: string,
    endDate: string,
    groupBy: "day" | "week" | "month" = "day"
  ): Promise<
    Array<{
      date: string;
      totalCalls: number;
      totalTokens: number;
      totalCost: number;
      uniqueUsers: number;
    }>
  > {
    try {
      const { data, error } = await supabaseAdmin
        .from("api_usage")
        .select("*")
        .gte("timestamp", startDate)
        .lte("timestamp", endDate)
        .order("timestamp", { ascending: true });

      if (error) {
        console.error("🔴 [AdminUsage] Error fetching time range data:", error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by date period
      const dateGroups = new Map<string, ApiUsageRow[]>();
      data.forEach((entry: ApiUsageRow) => {
        let groupKey: string;
        const timestamp = new Date(entry.timestamp);

        switch (groupBy) {
          case "day":
            groupKey = entry.timestamp.split("T")[0]; // YYYY-MM-DD
            break;
          case "week":
            // Get Monday of the week using date-only arithmetic (no time components)
            {
              const dateOnly = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
              const dayOfWeek = dateOnly.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
              const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday to 6, others to dayOfWeek - 1
              const mondayDate = new Date(dateOnly);
              mondayDate.setDate(dateOnly.getDate() - daysToSubtract);
              groupKey = mondayDate.toISOString().split("T")[0];
              break;
            }
          case "month":
            groupKey = `${timestamp.getFullYear()}-${String(
              timestamp.getMonth() + 1
            ).padStart(2, "0")}`; // YYYY-MM
            break;
          default:
            groupKey = entry.timestamp.split("T")[0];
        }

        if (!dateGroups.has(groupKey)) {
          dateGroups.set(groupKey, []);
        }
        dateGroups.get(groupKey)!.push(entry);
      });

      // Calculate stats for each date group
      const result = Array.from(dateGroups.entries()).map(([date, entries]) => {
        const uniqueUsers = new Set(entries.map((e) => e.user_id)).size;
        const totalCalls = entries.length;
        const totalTokens = entries.reduce(
          (sum, e) => sum + (e.tokens_used || 0),
          0
        );
        const totalCost = entries.reduce(
          (sum, e) => sum + Number(e.calculated_cost || 0),
          0
        );

        return {
          date,
          totalCalls,
          totalTokens,
          totalCost,
          uniqueUsers,
        };
      });

      const sortedResult = result.sort((a, b) => a.date.localeCompare(b.date));
      return sortedResult;
    } catch (error) {
      console.error("🔴 [AdminUsage] Error in getUsageByTimeRange:", error);
      return [];
    }
  }

  private calculateStatsFromData(data: ApiUsageRow[]): UsageStats {
    const totalCalls = data.length;
    const totalTokens = data.reduce(
      (sum, entry) => sum + (entry.tokens_used || 0),
      0
    );
    const totalCost = data.reduce(
      (sum, entry) => sum + Number(entry.calculated_cost || 0),
      0
    );

    // Find most used model
    const modelCounts = new Map<string, number>();
    data.forEach((entry) => {
      if (entry.model) {
        modelCounts.set(entry.model, (modelCounts.get(entry.model) || 0) + 1);
      }
    });

    const mostUsedModel =
      Array.from(modelCounts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "";

    return {
      totalCalls,
      totalTokens,
      totalCost,
      averageTokensPerCall: totalCalls > 0 ? totalTokens / totalCalls : 0,
      averageCostPerCall: totalCalls > 0 ? totalCost / totalCalls : 0,
      mostUsedModel,
      dateRange: { start: "", end: "" }, // Will be filled by caller
    };
  }

  public async getModelUsageStats(
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    model: string;
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    averageTokensPerCall: number;
    percentageOfTotal: number;
  }>> {
    try {
      let query = supabaseAdmin.from("api_usage").select("*");

      if (startDate) {
        query = query.gte("timestamp", startDate);
      }
      if (endDate) {
        query = query.lte("timestamp", endDate);
      }

      const { data, error } = await query.order("timestamp", {
        ascending: false,
      });

      if (error) {
        console.error("🔴 [AdminUsage] Error fetching model usage stats:", error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by model and calculate statistics
      const modelStats = new Map<string, {
        totalCalls: number;
        totalTokens: number;
        totalCost: number;
      }>();

      let grandTotalCalls = 0;

      data.forEach((entry: ApiUsageRow) => {
        const model = entry.model || 'unknown';
        const tokens = Number(entry.tokens_used || 0);
        const cost = Number(entry.calculated_cost || 0);

        if (!modelStats.has(model)) {
          modelStats.set(model, {
            totalCalls: 0,
            totalTokens: 0,
            totalCost: 0,
          });
        }

        const stats = modelStats.get(model)!;
        stats.totalCalls += 1;
        stats.totalTokens += tokens;
        stats.totalCost += cost;

        grandTotalCalls += 1;
      });

      // Convert to array and calculate percentages
      const result = Array.from(modelStats.entries())
        .map(([model, stats]) => ({
          model,
          totalCalls: stats.totalCalls,
          totalTokens: stats.totalTokens,
          totalCost: stats.totalCost,
          averageTokensPerCall: stats.totalCalls > 0 ? stats.totalTokens / stats.totalCalls : 0,
          percentageOfTotal: grandTotalCalls > 0 ? (stats.totalCalls / grandTotalCalls) * 100 : 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost); // Sort by cost descending

      return result;
    } catch (error) {
      console.error("🔴 [AdminUsage] Error in getModelUsageStats:", error);
      return [];
    }
  }

  public async getImageStorageStats(): Promise<{
    totalImages: number;
    totalStorageMB: number;
    totalStorageGB: number;
    totalStorageCost: number;
    usersWithImages: number;
    averageImagesPerUser: number;
  }> {
    try {
      console.log("🔍 [AdminUsage] Fetching image storage stats...");
      const { data, error } = await supabaseAdmin
        .from("recipes")
        .select("user_id, image_url, image_metadata")
        .not("image_url", "is", null);

      if (error) {
        console.error("🔴 [AdminUsage] Error fetching image storage stats:", error);
        return {
          totalImages: 0,
          totalStorageMB: 0,
          totalStorageGB: 0,
          totalStorageCost: 0,
          usersWithImages: 0,
          averageImagesPerUser: 0,
        };
      }

      console.log(`🔍 [AdminUsage] Found ${data?.length || 0} recipes with images`);

      if (!data || data.length === 0) {
        return {
          totalImages: 0,
          totalStorageMB: 0,
          totalStorageGB: 0,
          totalStorageCost: 0,
          usersWithImages: 0,
          averageImagesPerUser: 0,
        };
      }

      const totalImages = data.length;
      const uniqueUsers = new Set(data.map(recipe => recipe.user_id)).size;

      // Calculate total storage from compressed sizes in metadata
      let totalStorageBytes = 0;
      data.forEach(recipe => {
        if (recipe.image_metadata && recipe.image_metadata.compressedSize) {
          totalStorageBytes += Number(recipe.image_metadata.compressedSize);
        }
      });

      const totalStorageMB = totalStorageBytes / (1024 * 1024);
      const totalStorageGB = totalStorageMB / 1024;
      
      // Supabase storage pricing: $0.021 per GB per month
      const totalStorageCost = totalStorageGB * 0.021;

      const averageImagesPerUser = uniqueUsers > 0 ? totalImages / uniqueUsers : 0;

      return {
        totalImages,
        totalStorageMB,
        totalStorageGB,
        totalStorageCost,
        usersWithImages: uniqueUsers,
        averageImagesPerUser,
      };
    } catch (error) {
      console.error("🔴 [AdminUsage] Error in getImageStorageStats:", error);
      return {
        totalImages: 0,
        totalStorageMB: 0,
        totalStorageGB: 0,
        totalStorageCost: 0,
        usersWithImages: 0,
        averageImagesPerUser: 0,
      };
    }
  }

  public async getMonthlyUsageSummary(
    monthStart?: string
  ): Promise<
    Array<{
      userId: string;
      monthStart: string;
      totalCost: number;
      totalTokens: number;
      totalCalls: number;
      warningEmailSentAt: string | null;
      limitEmailSentAt: string | null;
      rateLimitEmailSentAt: string | null;
      limitEnforcedAt: string | null;
    }>
  > {
    try {
      const targetMonthStart =
        monthStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0];

      const { data, error } = await supabaseAdmin
        .from('monthly_usage_summary')
        .select('*')
        .eq('month_start', targetMonthStart);

      if (error) {
        console.error('[AdminUsage] Error fetching monthly summary:', error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map((row) => ({
        userId: row.user_id,
        monthStart: row.month_start,
        totalCost: Number(row.total_cost || 0),
        totalTokens: Number(row.total_tokens || 0),
        totalCalls: Number(row.total_calls || 0),
        warningEmailSentAt: row.warning_email_sent_at,
        limitEmailSentAt: row.limit_email_sent_at,
        rateLimitEmailSentAt: row.rate_limit_email_sent_at,
        limitEnforcedAt: row.limit_enforced_at,
      }));
    } catch (error) {
      console.error('[AdminUsage] Error in getMonthlyUsageSummary:', error);
      return [];
    }
  }
}

export const adminUsageService = new AdminUsageService();
