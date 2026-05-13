"use client";

import { useEffect, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Loader2, Target, Pencil, Trash2, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import type { AppRouter } from "@/app/server/routers/_app";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Goal = RouterOutputs["goals"]["list"][number];
export type GoalType = "monthly_profit" | "yearly_profit";

export const GOAL_TYPES: GoalType[] = ["monthly_profit", "yearly_profit"];

export const GOAL_LABELS: Record<GoalType, { label: string; description: string; example: string }> = {
  monthly_profit: {
    label: "Monthly Profit Target",
    description: "Target realized P/L per calendar month",
    example: "e.g. 1000 for $1,000/month",
  },
  yearly_profit: {
    label: "Yearly Profit Target",
    description: "Target realized P/L for the full calendar year",
    example: "e.g. 10000 for $10,000/year",
  },
};

export function GoalRow({
  goalType,
  existing,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  goalType: GoalType;
  existing: Goal | undefined;
  onSave: (goalType: GoalType, amount: string) => void;
  onDelete: (goalType: GoalType) => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(existing ? Number(existing.amount).toFixed(2) : "");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setValue(existing ? Number(existing.amount).toFixed(2) : "");
      setEditing(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [existing]);

  const meta = GOAL_LABELS[goalType];

  const handleSave = () => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    onSave(goalType, num.toFixed(2));
  };

  return (
    <div className="flex flex-col gap-3 border rounded-lg p-4 bg-card shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-semibold">{meta.label}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
        </div>
        {existing && !editing && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(goalType)}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {existing && !editing ? (
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-primary">
            ${Number(existing.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="text-sm text-muted-foreground">
            / {goalType === "monthly_profit" ? "month" : "year"}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={meta.example}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="pl-7"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
          </div>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {existing ? "Update" : "Set Goal"}
          </Button>
          {existing && editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
