"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TimePeriod } from "./chart-controls";
import { useTranslations, useLocale } from 'next-intl';
import { SupportedLocale } from '@/lib/date-utils';

interface TimeRangeData {
  date: string;
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  uniqueUsers: number;
}

interface UsersBarChartProps {
  data: TimeRangeData[];
  timePeriod: TimePeriod;
  loading?: boolean;
}

export function UsersBarChart({ data, timePeriod, loading }: UsersBarChartProps) {
  const t = useTranslations('admin');
  const locale = useLocale() as SupportedLocale;
  
  const getTranslatedPeriod = (period: TimePeriod): string => {
    switch (period) {
      case 'day': return t('daily');
      case 'week': return t('weekly');
      case 'month': return t('monthly');
      default: return period;
    }
  };
  
  const chartConfig = {
    uniqueUsers: {
      label: t('uniqueUsersChart'),
      color: "hsl(217 91% 60%)",
    },
  } as const;
  const chartData = useMemo(() => {
    return data.map((item) => {
      let displayDate: string;
      
      const localeCode = locale === 'nl' ? 'nl-NL' : 'en-US';
      
      switch (timePeriod) {
        case 'day':
          displayDate = new Date(item.date).toLocaleDateString(localeCode, { 
            month: 'short', 
            day: 'numeric' 
          });
          break;
        case 'week':
          // For weeks, show "Week of MMM DD"
          const weekDate = new Date(item.date).toLocaleDateString(localeCode, { 
            month: 'short', 
            day: 'numeric' 
          });
          displayDate = t('weekOf', { date: weekDate });
          break;
        case 'month':
          // For months, show "MMM YYYY"
          const [year, month] = item.date.split('-');
          displayDate = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(localeCode, { 
            month: 'short', 
            year: 'numeric' 
          });
          break;
        default:
          displayDate = item.date;
      }

      return {
        ...item,
        displayDate,
      };
    });
  }, [data, timePeriod, t]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('userActivityOverTime')}</CardTitle>
          <CardDescription>
            {t('uniqueUsersBy', { period: getTranslatedPeriod(timePeriod) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('userActivityOverTime')}</CardTitle>
          <CardDescription>
            {t('uniqueUsersBy', { period: getTranslatedPeriod(timePeriod) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {t('noUserData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userActivityOverTime')}</CardTitle>
        <CardDescription>
          {t('uniqueUsersBy', { period: getTranslatedPeriod(timePeriod) })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="stroke-muted" 
              vertical={false}
            />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              className="text-xs"
              angle={timePeriod === 'week' ? -45 : 0}
              textAnchor={timePeriod === 'week' ? 'end' : 'middle'}
              height={timePeriod === 'week' ? 60 : 30}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="text-xs"
              allowDecimals={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  hideLabel={false}
                />
              }
            />
            <Bar
              dataKey="uniqueUsers"
              fill="var(--color-uniqueUsers)"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}