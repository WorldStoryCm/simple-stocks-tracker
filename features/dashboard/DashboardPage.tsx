"use client";

import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28bfe', '#ff7675', '#fdcb6e', '#e17055', '#d63031', '#e84393'];

export function DashboardPage() {
  const { data: session } = useSession();
  const { data: perf, isLoading } = trpc.performance.stats.useQuery();

  const renderStatsList = (dataObj: any) => {
    if (!dataObj || !dataObj.data || dataObj.data.length === 0) {
      return (
        <div className="text-muted-foreground text-sm italic py-4">
          No realized matching data yet. Add Sell trades to see realized performance.
        </div>
      );
    }
    
    return (
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between text-sm pb-3 border-b border-border/50 bg-muted/30 p-2 rounded-lg">
          <span className="text-muted-foreground">Avg: <span className={dataObj.average >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>${dataObj.average.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          <span className="text-muted-foreground">Min: <span className={dataObj.min >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>${dataObj.min.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          <span className="text-muted-foreground">Max: <span className={dataObj.max >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>${dataObj.max.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
        </div>
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 px-1">
          {dataObj.data.map((m: any, i: number) => (
            <div key={i} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
              <div className="font-medium text-lg">{m.period}</div>
              <div className={`font-bold text-lg ${m.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {m.pnl >= 0 ? "+" : ""}${m.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Welcome back, {session?.user?.name?.split(' ')[0] || "Trader"}</h1>
      
      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground w-8 h-8" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Invested Capital</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(perf?.totalInvested || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Realized P/L</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(perf?.totalRealizedPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(perf?.totalRealizedPnl || 0) >= 0 ? '+' : ''}${(perf?.totalRealizedPnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital by Platform</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {perf?.investedPerPlatform?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={perf.investedPerPlatform} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={(props: any) => `$${Number(props.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                        {perf.investedPerPlatform.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No active investments</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital by Bucket</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {perf?.investedPerBucket?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={perf.investedPerBucket} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={(props: any) => `$${Number(props.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                        {perf.investedPerBucket.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(val: any) => `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No active investments</div>}
              </CardContent>
            </Card>
          </div>

          <Card className="">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Performance Logs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="daily" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
                <TabsContent value="daily">
                  {renderStatsList(perf?.dailyStats)}
                </TabsContent>
                <TabsContent value="weekly">
                  {renderStatsList(perf?.weeklyStats)}
                </TabsContent>
                <TabsContent value="monthly">
                  {renderStatsList(perf?.monthlyStats)}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
