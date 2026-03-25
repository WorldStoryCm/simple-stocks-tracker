"use client";

import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: session } = useSession();
  const { data: perf, isLoading } = trpc.performance.stats.useQuery();

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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(perf?.winRate || 0).toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Trade Lots Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{perf?.totalMatches || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {perf?.monthlyPnl && perf.monthlyPnl.length > 0 ? (
                <div className="space-y-4">
                  {perf.monthlyPnl.map((m: any) => (
                    <div key={m.month} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <div className="font-medium text-lg">{m.month}</div>
                      <div className={`font-bold text-lg ${m.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {m.pnl >= 0 ? "+" : ""}${m.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm italic">No realized matching data yet. Add Sell trades to see realized performance.</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
