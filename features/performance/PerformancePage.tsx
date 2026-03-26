"use client";

import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";

export function PerformancePage() {
  const { data: stats, isLoading } = trpc.performance.stats.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  const renderChart = (title: string, dataObj: any) => {
    if (!dataObj || !dataObj.data || dataObj.data.length === 0) {
      return (
        <Card className="col-span-full mt-4 border-0 shadow-none">
          <CardContent className="h-[400px] p-0">
            <div className="h-full flex items-center justify-center text-muted-foreground border-dashed border-2 rounded-md">
              Not enough data available for the chart. Close some trades first.
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="col-span-full mt-4 border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{title} Performance</CardTitle>
            <div className="flex items-center gap-4 mt-2 sm:mt-0 text-sm font-medium bg-muted/50 p-2 rounded-lg border">
              <span className="text-muted-foreground">Avg: <span className={dataObj.average >= 0 ? "text-green-500" : "text-red-500"}>${dataObj.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
              <span className="text-muted-foreground">Min: <span className={dataObj.min >= 0 ? "text-green-500" : "text-red-500"}>${dataObj.min.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
              <span className="text-muted-foreground">Max: <span className={dataObj.max >= 0 ? "text-green-500" : "text-red-500"}>${dataObj.max.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[400px] px-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataObj.data}>
              <XAxis dataKey="period" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'P/L']} />
              <Bar dataKey="pnl" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Performance</h1>
        <p className="text-muted-foreground mt-1">Detailed history and analytics of your realized returns.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realized P/L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(stats?.totalRealizedPnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
              ${stats?.totalRealizedPnl.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all closed trades</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-full mt-4">
        <CardContent className="pt-6">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              {renderChart("Daily", stats?.dailyStats)}
            </TabsContent>
            <TabsContent value="weekly">
              {renderChart("Weekly", stats?.weeklyStats)}
            </TabsContent>
            <TabsContent value="monthly">
              {renderChart("Monthly", stats?.monthlyStats)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
