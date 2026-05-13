"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import toast from "react-hot-toast";
import { CURRENCY_OPTIONS } from "@/lib/constants";
import { currencySymbol, formatAmount } from "@/lib/currency";

type CurrencyOption = (typeof CURRENCY_OPTIONS)[number]["value"];

export function CapitalProgressSection() {
  const [progressCurrency, setProgressCurrency] = useState<CurrencyOption>("EUR");
  const [progressTargetAmount, setProgressTargetAmount] = useState("");

  const { data: capitalProgressSettings, isLoading: capitalProgressLoading } = trpc.capitalProgress.get.useQuery();
  const utils = trpc.useUtils();

  const saveCapitalProgressMutation = trpc.capitalProgress.upsert.useMutation({
    onSuccess: () => {
      utils.capitalProgress.get.invalidate();
      utils.performance.stats.invalidate();
      toast.success("Capital progress settings saved");
    },
    onError: (err) => toast.error(err.message || "Failed to save capital progress settings"),
  });

  useEffect(() => {
    if (!capitalProgressSettings) return;

    const timeoutId = window.setTimeout(() => {
      setProgressCurrency(capitalProgressSettings.currencyCode as CurrencyOption);
      setProgressTargetAmount(Number(capitalProgressSettings.targetAmount).toFixed(2));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [capitalProgressSettings]);

  const handleSaveCapitalProgress = () => {
    const targetAmount = Number(progressTargetAmount);

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error("Enter a target amount greater than 0");
      return;
    }

    saveCapitalProgressMutation.mutate({
      currencyCode: progressCurrency,
      targetAmount: targetAmount.toFixed(2),
    });
  };

  return (
    <Card id="capital-progress-settings" loading={capitalProgressLoading}>
      <CardHeader>
        <CardTitle>Capital Goal Progress</CardTitle>
        <CardDescription>
          Set the currency and target for the dashboard capital goal. Progress is the current value of your open positions plus cash across active platforms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {capitalProgressLoading ? (
          <div className="min-h-[180px]" />
        ) : (
          <div className="grid gap-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="progress-currency">Progress Currency</Label>
                <Select value={progressCurrency} onValueChange={(value) => setProgressCurrency(value as CurrencyOption)}>
                  <SelectTrigger id="progress-currency" className="h-10">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="progress-target">Target Amount</Label>
                <Input
                  id="progress-target"
                  type="number"
                  step="0.01"
                  min="0"
                  value={progressTargetAmount}
                  onChange={(e) => setProgressTargetAmount(e.target.value)}
                  startAddon={currencySymbol(progressCurrency)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Current setup: target {formatAmount(Number(progressTargetAmount || 0), progressCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}.
              </p>
              <Button onClick={handleSaveCapitalProgress} disabled={saveCapitalProgressMutation.isPending}>
                {saveCapitalProgressMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save capital progress
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
