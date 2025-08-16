"use client";

import { useState, useEffect, useCallback } from "react";
import { ChartControls, TimePeriod } from "./chart-controls";
import { CostBarChart } from "./cost-bar-chart";
import { UsersBarChart } from "./users-bar-chart";
import { AdminUsageStatsResponse } from "@/app/api/admin/usage-stats/route";

interface TimeRangeData {
  date: string;
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  uniqueUsers: number;
}

interface AdminChartsSectionProps {
  isAdmin: boolean;
}

export function AdminChartsSection({ isAdmin }: AdminChartsSectionProps) {
  const [chartData, setChartData] = useState<TimeRangeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0]
    };
  });
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');

  const fetchChartData = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        timeRange: timePeriod
      });

      const response = await fetch(`/api/admin/usage-stats?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.status}`);
      }

      const data: AdminUsageStatsResponse = await response.json();
      
      if (data.type === 'summary') {
        setChartData(data.data.timeRange || []);
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, dateRange, timePeriod]);

  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
  };

  const handleRefresh = () => {
    fetchChartData();
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <ChartControls
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        timePeriod={timePeriod}
        loading={loading}
        onDateRangeChange={handleDateRangeChange}
        onTimePeriodChange={handleTimePeriodChange}
        onRefresh={handleRefresh}
      />

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <CostBarChart 
          data={chartData} 
          timePeriod={timePeriod}
          loading={loading} 
        />
        <UsersBarChart 
          data={chartData} 
          timePeriod={timePeriod}
          loading={loading} 
        />
      </div>
    </div>
  );
}