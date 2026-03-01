import { db } from "@/db";
import {
  apiUsage,
  recipes,
  monthlyUsageSummary,
} from "@/db/schema";
import { eq, gte, lte, isNotNull, count, and } from "drizzle-orm";
import { type UserUsageStats, type UsageStats } from "./usage-tracking-service";

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
      const [result] = await db.select({ count: count() }).from(recipes);

      const total = result?.count ?? 0;
      console.log(`🔍 [AdminUsage] Total recipe count: ${total}`);
      return total;
    } catch (error) {
      console.error("🔴 [AdminUsage] Error in getTotalRecipeCount:", error);
      return 0;
    }
  }

  public async getAllUsersUsageStats(
    startDate?: string,
    endDate?: string,
  ): Promise<UserUsageStats[]> {
    try {
      console.log("🔍 [AdminUsage] Fetching all users usage stats...", {
        startDate,
        endDate,
      });

      const conditions = [];
      if (startDate) {
        conditions.push(gte(apiUsage.timestamp, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(apiUsage.timestamp, new Date(endDate)));
      }

      const rows = await db
        .select()
        .from(apiUsage)
        .where(
          conditions.length > 0 ? and(...conditions) : undefined,
        )
        .orderBy(apiUsage.timestamp);

      console.log(
        `🔍 [AdminUsage] Found ${rows.length} API usage records`,
      );

      if (rows.length === 0) {
        return [];
      }

      // Group data by user
      const userDataMap = new Map<string, ApiUsageRow[]>();
      rows.forEach((entry) => {
        const row = this.toApiUsageRow(entry);
        if (!userDataMap.has(row.user_id)) {
          userDataMap.set(row.user_id, []);
        }
        userDataMap.get(row.user_id)!.push(row);
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

      console.log(
        `🔍 [AdminUsage] Calculated stats for ${userStats.length} users`,
      );

      // Sort by total cost (descending) and add ranks
      userStats.sort((a, b) => b.totalCost - a.totalCost);
      userStats.forEach((stats, index) => {
        stats.rank = index + 1;
      });

      // Detect outliers (users with >2x average usage)
      const avgCost =
        userStats.reduce((sum, s) => sum + s.totalCost, 0) / userStats.length;
      const avgTokens =
        userStats.reduce((sum, s) => sum + s.totalTokens, 0) /
        userStats.length;

      console.log(
        `🔍 [AdminUsage] Average cost: ${avgCost.toFixed(4)}, Average tokens: ${avgTokens.toFixed(0)}`,
      );

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
    endDate?: string,
  ): Promise<UserUsageStats | null> {
    try {
      const conditions = [eq(apiUsage.userId, userId)];
      if (startDate) {
        conditions.push(gte(apiUsage.timestamp, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(apiUsage.timestamp, new Date(endDate)));
      }

      const rows = await db
        .select()
        .from(apiUsage)
        .where(and(...conditions));

      if (rows.length === 0) {
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

      const data = rows.map((r) => this.toApiUsageRow(r));
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
    groupBy: "day" | "week" | "month" = "day",
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
      const rows = await db
        .select()
        .from(apiUsage)
        .where(
          and(
            gte(apiUsage.timestamp, new Date(startDate)),
            lte(apiUsage.timestamp, new Date(endDate)),
          ),
        )
        .orderBy(apiUsage.timestamp);

      if (rows.length === 0) {
        return [];
      }

      // Group by date period
      const dateGroups = new Map<
        string,
        Array<typeof apiUsage.$inferSelect>
      >();
      rows.forEach((entry) => {
        let groupKey: string;
        const timestamp = entry.timestamp
          ? new Date(entry.timestamp)
          : new Date();

        switch (groupBy) {
          case "day":
            groupKey = timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
            break;
          case "week":
            // Get Monday of the week using date-only arithmetic
            {
              const dateOnly = new Date(
                timestamp.getFullYear(),
                timestamp.getMonth(),
                timestamp.getDate(),
              );
              const dayOfWeek = dateOnly.getDay();
              const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const mondayDate = new Date(dateOnly);
              mondayDate.setDate(dateOnly.getDate() - daysToSubtract);
              groupKey = mondayDate.toISOString().split("T")[0];
              break;
            }
          case "month":
            groupKey = `${timestamp.getFullYear()}-${String(
              timestamp.getMonth() + 1,
            ).padStart(2, "0")}`;
            break;
          default:
            groupKey = timestamp.toISOString().split("T")[0];
        }

        if (!dateGroups.has(groupKey)) {
          dateGroups.set(groupKey, []);
        }
        dateGroups.get(groupKey)!.push(entry);
      });

      // Calculate stats for each date group
      const result = Array.from(dateGroups.entries()).map(
        ([date, entries]) => {
          const uniqueUsers = new Set(entries.map((e) => e.userId)).size;
          const totalCalls = entries.length;
          const totalTokens = entries.reduce(
            (sum, e) => sum + (e.tokensUsed || 0),
            0,
          );
          const totalCost = entries.reduce(
            (sum, e) => sum + Number(e.calculatedCost || 0),
            0,
          );

          return {
            date,
            totalCalls,
            totalTokens,
            totalCost,
            uniqueUsers,
          };
        },
      );

      return result.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error("🔴 [AdminUsage] Error in getUsageByTimeRange:", error);
      return [];
    }
  }

  private calculateStatsFromData(data: ApiUsageRow[]): UsageStats {
    const totalCalls = data.length;
    const totalTokens = data.reduce(
      (sum, entry) => sum + (entry.tokens_used || 0),
      0,
    );
    const totalCost = data.reduce(
      (sum, entry) => sum + Number(entry.calculated_cost || 0),
      0,
    );

    // Find most used model
    const modelCounts = new Map<string, number>();
    data.forEach((entry) => {
      if (entry.model) {
        modelCounts.set(
          entry.model,
          (modelCounts.get(entry.model) || 0) + 1,
        );
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
    endDate?: string,
  ): Promise<
    Array<{
      model: string;
      totalCalls: number;
      totalTokens: number;
      totalCost: number;
      averageTokensPerCall: number;
      percentageOfTotal: number;
    }>
  > {
    try {
      const conditions = [];
      if (startDate) {
        conditions.push(gte(apiUsage.timestamp, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(apiUsage.timestamp, new Date(endDate)));
      }

      const rows = await db
        .select()
        .from(apiUsage)
        .where(
          conditions.length > 0 ? and(...conditions) : undefined,
        );

      if (rows.length === 0) {
        return [];
      }

      // Group by model and calculate statistics
      const modelStats = new Map<
        string,
        {
          totalCalls: number;
          totalTokens: number;
          totalCost: number;
        }
      >();

      let grandTotalCalls = 0;

      rows.forEach((entry) => {
        const model = entry.model || "unknown";
        const tokens = Number(entry.tokensUsed || 0);
        const cost = Number(entry.calculatedCost || 0);

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
          averageTokensPerCall:
            stats.totalCalls > 0 ? stats.totalTokens / stats.totalCalls : 0,
          percentageOfTotal:
            grandTotalCalls > 0
              ? (stats.totalCalls / grandTotalCalls) * 100
              : 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost);

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
      const data = await db
        .select({
          userId: recipes.userId,
          imageUrl: recipes.imageUrl,
          imageMetadata: recipes.imageMetadata,
        })
        .from(recipes)
        .where(isNotNull(recipes.imageUrl));

      console.log(
        `🔍 [AdminUsage] Found ${data.length} recipes with images`,
      );

      if (data.length === 0) {
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
      const uniqueUsers = new Set(data.map((recipe) => recipe.userId)).size;

      // Calculate total storage from compressed sizes in metadata
      let totalStorageBytes = 0;
      data.forEach((recipe) => {
        const metadata = recipe.imageMetadata as Record<
          string,
          unknown
        > | null;
        if (metadata && typeof metadata.compressedSize === "number") {
          totalStorageBytes += metadata.compressedSize;
        }
      });

      const totalStorageMB = totalStorageBytes / (1024 * 1024);
      const totalStorageGB = totalStorageMB / 1024;

      // Storage pricing: $0.021 per GB per month
      const totalStorageCost = totalStorageGB * 0.021;

      const averageImagesPerUser =
        uniqueUsers > 0 ? totalImages / uniqueUsers : 0;

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
    monthStart?: string,
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
        monthStart ||
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];

      const data = await db
        .select()
        .from(monthlyUsageSummary)
        .where(eq(monthlyUsageSummary.monthStart, targetMonthStart));

      return data.map((row) => ({
        userId: row.userId,
        monthStart: row.monthStart,
        totalCost: Number(row.totalCost ?? "0"),
        totalTokens: Number(row.totalTokens),
        totalCalls: Number(row.totalCalls || 0),
        warningEmailSentAt: row.warningEmailSentAt?.toISOString() ?? null,
        limitEmailSentAt: row.limitEmailSentAt?.toISOString() ?? null,
        rateLimitEmailSentAt:
          row.rateLimitEmailSentAt?.toISOString() ?? null,
        limitEnforcedAt: row.limitEnforcedAt?.toISOString() ?? null,
      }));
    } catch (error) {
      console.error(
        "[AdminUsage] Error in getMonthlyUsageSummary:",
        error,
      );
      return [];
    }
  }

  private toApiUsageRow(
    row: typeof apiUsage.$inferSelect,
  ): ApiUsageRow {
    return {
      id: row.id,
      user_id: row.userId || "",
      endpoint: row.endpoint,
      model: row.model || "",
      prompt_tokens: row.promptTokens || 0,
      completion_tokens: row.completionTokens || 0,
      tokens_used: row.tokensUsed || 0,
      calculated_cost: Number(row.calculatedCost || 0),
      timestamp: row.timestamp?.toISOString() || "",
    };
  }
}

export const adminUsageService = new AdminUsageService();
