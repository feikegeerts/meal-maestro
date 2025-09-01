"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageLoading } from "@/components/ui/page-loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  RefreshCw,
  Calendar,
  AlertTriangle,
  BookOpen,
  Images,
} from "lucide-react";
import { AdminUsageStatsResponse } from "@/app/api/admin/usage-stats/route";
import { AdminChartsSection } from "@/components/admin/admin-charts-section";
import { useTranslations } from "next-intl";

interface DashboardStats {
  totalUsers: number;
  totalRecipes: number;
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  averageCostPerUser: number;
  averageTokensPerUser: number;
  averageCallsPerUser: number;
}

interface ImageStorageStats {
  totalImages: number;
  totalStorageMB: number;
  totalStorageGB: number;
  totalStorageCost: number;
  usersWithImages: number;
  averageImagesPerUser: number;
}

interface TopUser {
  userId: string;
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  rank?: number;
}

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [imageStats, setImageStats] = useState<ImageStorageStats | null>(null);
  const [topUsersByCost, setTopUsersByCost] = useState<TopUser[]>([]);
  const [outliers, setOutliers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const t = useTranslations("admin");

  const fetchOverviewStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get overview stats for all time (no date range for overview cards)
      const overviewParams = new URLSearchParams();

      const overviewResponse = await fetch(
        `/api/admin/usage-stats?${overviewParams}`
      );

      if (!overviewResponse.ok) {
        throw new Error(
          `Failed to fetch overview stats: ${overviewResponse.status}`
        );
      }

      const overviewData: AdminUsageStatsResponse =
        await overviewResponse.json();

      if (overviewData.type === "summary" && overviewData.data.overview) {
        setStats(overviewData.data.overview);
        // Only set image stats if they exist, otherwise use fallback
        if (overviewData.data.imageStorage) {
          setImageStats(overviewData.data.imageStorage);
        } else {
          setImageStats({
            totalImages: 0,
            totalStorageMB: 0,
            totalStorageGB: 0,
            totalStorageCost: 0,
            usersWithImages: 0,
            averageImagesPerUser: 0,
          });
        }
        setTopUsersByCost(overviewData.data.topUsers?.byCost || []);
        setOutliers(overviewData.data.outliers?.users || []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching overview stats:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch overview statistics"
      );
    } finally {
      setLoading(false);
    }
  };

  // Check admin status based on profile role
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !profile) {
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }

    // Check if user has admin role
    if (profile.role === "admin") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }

    setAdminLoading(false);
  }, [user, profile, authLoading]);

  // Handle navigation based on authentication state
  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        router.push("/login");
        return;
      }
      
      if (isAdmin === false) {
        router.push("/recipes");
        return;
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, router]);

  // Fetch overview stats once admin status is confirmed
  useEffect(() => {
    if (isAdmin === true) {
      fetchOverviewStats();
    }
  }, [isAdmin]);

  const formatCost = (cost: number): string => {
    if (cost >= 1) {
      return `$${cost.toFixed(2)}`;
    } else if (cost >= 0.001) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(6)}`;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (authLoading || adminLoading) {
    return <PageLoading />;
  }

  if (!user || isAdmin === false) {
    return <PageLoading />; // Will redirect via useEffect
  }

  if (loading && !stats) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 pt-4 pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <Skeleton className="h-10 w-32" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 pt-4 pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span>
                    {t("errorLoading")}: {error}
                  </span>
                </div>
                <Button
                  onClick={fetchOverviewStats}
                  className="mt-4"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("retry")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 pt-4 pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t("title")}</h1>
              <p className="text-muted-foreground">{t("overview")}</p>
            </div>
            <div className="flex items-center space-x-2">
              {lastUpdated && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {t("lastUpdated")}: {lastUpdated.toLocaleTimeString()}
                  </span>
                </div>
              )}
              <Button
                onClick={fetchOverviewStats}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                {t("refresh")}
              </Button>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("totalUsers")}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {t("activeUsersMonth")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("totalRecipes")}
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRecipes}</div>
                <p className="text-xs text-muted-foreground">
                  {t("recipesInDatabase")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Image Storage
                </CardTitle>
                <Images className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {imageStats ? formatNumber(imageStats.totalImages) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {imageStats ? formatFileSize(imageStats.totalStorageMB * 1024 * 1024) : '0 B'} • {imageStats ? formatCost(imageStats.totalStorageCost) : '$0.00'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("totalCost")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCost(stats.totalCost)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCost(stats.averageCostPerUser)} {t("perUser")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("totalTokens")}
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(stats.totalTokens)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats.averageTokensPerUser)} {t("perUser")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("apiCalls")}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(stats.totalCalls)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(stats.averageCallsPerUser)} {t("perUser")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Users and Outliers */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Users by Cost */}
            <Card>
              <CardHeader>
                <CardTitle>{t("topUsersByCost")}</CardTitle>
                <CardDescription>{t("highestSpendingUsers")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topUsersByCost.slice(0, 5).map((user, index) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className="w-6 h-6 p-0 flex items-center justify-center text-xs"
                        >
                          {index + 1}
                        </Badge>
                        <span className="text-sm font-mono">
                          {user.userId.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {formatCost(user.totalCost)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(user.totalTokens)} {t("tokens")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {topUsersByCost.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("noUsageData")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Outliers */}
            <Card>
              <CardHeader>
                <CardTitle>{t("usageOutliers")}</CardTitle>
                <CardDescription>{t("unusuallyHighUsage")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {outliers.slice(0, 5).map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-mono">
                          {user.userId.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {formatCost(user.totalCost)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(user.totalTokens)} {t("tokens")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {outliers.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("noOutliers")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <AdminChartsSection isAdmin={isAdmin === true} />
        </div>
      </div>
    </PageWrapper>
  );
}
