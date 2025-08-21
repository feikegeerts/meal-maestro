"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, DollarSign, Activity } from "lucide-react";
import { useTranslations } from "next-intl";

interface ModelUsageData {
  model: string;
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  averageTokensPerCall: number;
  percentageOfTotal: number;
}

interface ModelUsageStatsProps {
  data: ModelUsageData[];
  isLoading?: boolean;
}

export function ModelUsageStats({ data, isLoading }: ModelUsageStatsProps) {
  const t = useTranslations("admin");
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {t("modelUsageBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {t("modelUsageBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t("noModelUsageData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getModelIcon = (model: string) => {
    if (model.includes('gpt-4o')) {
      return <Brain className="h-4 w-4 text-purple-500" />;
    }
    if (model.includes('mini') || model.includes('nano')) {
      return <Zap className="h-4 w-4 text-blue-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getModelBadgeColor = (model: string) => {
    if (model.includes('gpt-4o')) {
      return "bg-purple-100 text-purple-800 hover:bg-purple-200";
    }
    if (model.includes('mini')) {
      return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    }
    if (model.includes('nano')) {
      return "bg-green-100 text-green-800 hover:bg-green-200";
    }
    return "bg-gray-100 text-gray-800 hover:bg-gray-200";
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return `$${(cost * 1000).toFixed(3)}k`; // Show as fractions of cents
    }
    return `$${cost.toFixed(3)}`;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          {t("modelUsageBreakdown")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((modelData) => (
            <Card key={modelData.model} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getModelIcon(modelData.model)}
                    <Badge 
                      variant="secondary" 
                      className={getModelBadgeColor(modelData.model)}
                    >
                      {modelData.model}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {modelData.percentageOfTotal.toFixed(1)}%
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t("apiCalls")}:</span>
                    <span className="font-medium">{modelData.totalCalls.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t("totalTokens")}:</span>
                    <span className="font-medium">{modelData.totalTokens.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t("avgTokens")}:</span>
                    <span className="font-medium">{Math.round(modelData.averageTokensPerCall).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm border-t pt-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {t("totalCost")}:
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatCost(modelData.totalCost)}
                    </span>
                  </div>
                </div>
                
                {/* Usage percentage bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(modelData.percentageOfTotal, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}