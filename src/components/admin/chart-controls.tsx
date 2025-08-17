"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { useTranslations } from 'next-intl';

export type TimePeriod = 'day' | 'week' | 'month';

interface ChartControlsProps {
  startDate: string;
  endDate: string;
  timePeriod: TimePeriod;
  loading?: boolean;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onTimePeriodChange: (period: TimePeriod) => void;
  onRefresh: () => void;
}

export function ChartControls({
  startDate,
  endDate,
  timePeriod,
  loading = false,
  onDateRangeChange,
  onTimePeriodChange,
  onRefresh
}: ChartControlsProps) {
  const t = useTranslations('admin');
  
  const timePeriodOptions: { value: TimePeriod; label: string }[] = [
    { value: 'day', label: t('daily') },
    { value: 'week', label: t('weekly') },
    { value: 'month', label: t('monthly') }
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t('chartSettings')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Label htmlFor="chart-startDate" className="text-sm whitespace-nowrap">{t('from')}:</Label>
            <Input
              id="chart-startDate"
              type="date"
              value={startDate}
              onChange={(e) => onDateRangeChange(e.target.value, endDate)}
              className="w-auto"
            />
            <Label htmlFor="chart-endDate" className="text-sm whitespace-nowrap">{t('to')}:</Label>
            <Input
              id="chart-endDate"
              type="date"
              value={endDate}
              onChange={(e) => onDateRangeChange(startDate, e.target.value)}
              className="w-auto"
            />
          </div>

          {/* Time Period Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t('period')}:</Label>
            <div className="flex gap-1">
              {timePeriodOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={timePeriod === option.value ? "default" : "outline"}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => onTimePeriodChange(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Refresh Button */}
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
            className="whitespace-nowrap"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('refreshChart')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}