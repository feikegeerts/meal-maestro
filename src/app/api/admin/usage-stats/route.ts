import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminUsageService } from "@/lib/admin-usage-service";

interface UsageStatsQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
  timeRange?: "day" | "week" | "month";
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { } = authResult;

  try {
    const { searchParams } = new URL(request.url);

    const query: UsageStatsQuery = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      userId: searchParams.get("userId") || undefined,
      timeRange: (searchParams.get("timeRange") as "day" | "week" | "month") || "day",
    };

    console.log("🔍 [AdminAPI] Processing admin stats request with query:", query);

    // If specific user requested, return their stats
    if (query.userId) {
      const userStats = await adminUsageService.getUserUsageStats(
        query.userId,
        query.startDate,
        query.endDate
      );

      if (!userStats) {
        return NextResponse.json(
          { error: "User not found or no usage data" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        type: "user",
        data: userStats,
      });
    }

    // Get all users stats for admin overview
    const allUsersStats = await adminUsageService.getAllUsersUsageStats(
      query.startDate,
      query.endDate
    );

    // Get total recipe count
    const totalRecipes = await adminUsageService.getTotalRecipeCount();

    // Get image storage statistics (with error handling)
    let imageStorageStats;
    try {
      imageStorageStats = await adminUsageService.getImageStorageStats();
    } catch (error) {
      console.error("🔴 [AdminAPI] Error fetching image storage stats:", error);
      imageStorageStats = {
        totalImages: 0,
        totalStorageMB: 0,
        totalStorageGB: 0,
        totalStorageCost: 0,
        usersWithImages: 0,
        averageImagesPerUser: 0,
      };
    }

    // Get time-based usage data for charts
    const timeRangeData =
      query.startDate && query.endDate
        ? await adminUsageService.getUsageByTimeRange(
            query.startDate,
            query.endDate,
            query.timeRange
          )
        : [];

    // Get model usage breakdown
    const modelUsageStats = await adminUsageService.getModelUsageStats(
      query.startDate,
      query.endDate
    );

    const monthlySummaries = await adminUsageService.getMonthlyUsageSummary();

    const monthlyUsage = (() => {
      if (monthlySummaries.length === 0) {
        return null;
      }

      const monthStart = monthlySummaries[0].monthStart;
      const totals = monthlySummaries.reduce(
        (acc, row) => {
          acc.totalCost += row.totalCost;
          acc.totalTokens += row.totalTokens;
          acc.totalCalls += row.totalCalls;
          if (row.limitEnforcedAt) {
            acc.cappedUsers += 1;
          } else if (row.warningEmailSentAt) {
            acc.warningUsers += 1;
          }
          if (row.rateLimitEmailSentAt) {
            acc.rateLimitAlerts += 1;
          }
          return acc;
        },
        {
          totalCost: 0,
          totalTokens: 0,
          totalCalls: 0,
          cappedUsers: 0,
          warningUsers: 0,
          rateLimitAlerts: 0,
        }
      );

      const topMonthlyUsers = [...monthlySummaries]
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 10);

      return {
        monthStart,
        ...totals,
        topUsers: topMonthlyUsers,
      };
    })();

    // Calculate overall statistics
    const totalUsers = allUsersStats.length;
    const totalCost = allUsersStats.reduce(
      (sum, stats) => sum + stats.totalCost,
      0
    );
    const totalTokens = allUsersStats.reduce(
      (sum, stats) => sum + stats.totalTokens,
      0
    );
    const totalCalls = allUsersStats.reduce(
      (sum, stats) => sum + stats.totalCalls,
      0
    );

    console.log("🔍 [AdminAPI] Calculated totals:", {
      totalUsers,
      totalRecipes,
      totalCost,
      totalTokens,
      totalCalls
    });

    // Identify outliers
    const outliers = allUsersStats.filter((stats) => stats.isOutlier);

    // Get top users by cost
    const topUsersByCost = allUsersStats.slice(0, 10);

    // Get top users by tokens
    const topUsersByTokens = [...allUsersStats]
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 10);

    const summary = {
      overview: {
        totalUsers,
        totalRecipes,
        totalCost,
        totalTokens,
        totalCalls,
        averageCostPerUser: totalUsers > 0 ? totalCost / totalUsers : 0,
        averageTokensPerUser: totalUsers > 0 ? totalTokens / totalUsers : 0,
        averageCallsPerUser: totalUsers > 0 ? totalCalls / totalUsers : 0,
      },
      imageStorage: imageStorageStats,
      outliers: {
        count: outliers.length,
        users: outliers.map((stats) => ({
          userId: stats.userId,
          totalCost: stats.totalCost,
          totalTokens: stats.totalTokens,
          totalCalls: stats.totalCalls,
          rank: stats.rank,
        })),
      },
      topUsers: {
        byCost: topUsersByCost.map((stats) => ({
          userId: stats.userId,
          totalCost: stats.totalCost,
          totalTokens: stats.totalTokens,
          totalCalls: stats.totalCalls,
          rank: stats.rank,
        })),
        byTokens: topUsersByTokens.map((stats, index) => ({
          userId: stats.userId,
          totalCost: stats.totalCost,
          totalTokens: stats.totalTokens,
          totalCalls: stats.totalCalls,
          rank: index + 1,
        })),
      },
      timeRange: timeRangeData,
      modelUsage: modelUsageStats,
      monthlyUsage,
      dateRange: {
        start: query.startDate || "all",
        end: query.endDate || "all",
      },
    };

    console.log("🔍 [AdminAPI] Returning summary data with keys:", Object.keys(summary));
    
    return NextResponse.json({
      type: "summary",
      data: summary,
    });
  } catch (error) {
    console.error("🔴 [AdminUsageStats] API error:", error);

    return NextResponse.json(
      { error: "Internal server error while fetching usage statistics" },
      { status: 500 }
    );
  }
}

// Export interface for frontend usage
export interface AdminUsageStatsResponse {
  type: "summary" | "user";
  data: {
    overview?: {
      totalUsers: number;
      totalRecipes: number;
      totalCost: number;
      totalTokens: number;
      totalCalls: number;
      averageCostPerUser: number;
      averageTokensPerUser: number;
      averageCallsPerUser: number;
    };
    imageStorage?: {
      totalImages: number;
      totalStorageMB: number;
      totalStorageGB: number;
      totalStorageCost: number;
      usersWithImages: number;
      averageImagesPerUser: number;
    };
    outliers?: {
      count: number;
      users: Array<{
        userId: string;
        totalCost: number;
        totalTokens: number;
        totalCalls: number;
        rank?: number;
      }>;
    };
    topUsers?: {
      byCost: Array<{
        userId: string;
        totalCost: number;
        totalTokens: number;
        totalCalls: number;
        rank?: number;
      }>;
      byTokens: Array<{
        userId: string;
        totalCost: number;
        totalTokens: number;
        totalCalls: number;
        rank: number;
      }>;
    };
    timeRange?: Array<{
      date: string;
      totalCalls: number;
      totalTokens: number;
      totalCost: number;
      uniqueUsers: number;
    }>;
    modelUsage?: Array<{
      model: string;
      totalCalls: number;
      totalTokens: number;
      totalCost: number;
      averageTokensPerCall: number;
      percentageOfTotal: number;
    }>;
    monthlyUsage?: {
      monthStart: string;
      totalCost: number;
      totalTokens: number;
      totalCalls: number;
      cappedUsers: number;
      warningUsers: number;
      rateLimitAlerts: number;
      topUsers: Array<{
        userId: string;
        monthStart: string;
        totalCost: number;
        totalTokens: number;
        totalCalls: number;
        warningEmailSentAt: string | null;
        limitEmailSentAt: string | null;
        rateLimitEmailSentAt: string | null;
        limitEnforcedAt: string | null;
      }>;
    };
    dateRange?: {
      start: string;
      end: string;
    };
  };
}
