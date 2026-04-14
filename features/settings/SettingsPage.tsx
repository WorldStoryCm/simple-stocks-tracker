"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/card";
import { Input } from "@/components/input";
import { Switch } from "@/components/switch";
import { Label } from "@/components/label";
import { Loader2, Target, Pencil, Trash2, Check, X } from "lucide-react";
import toast from "react-hot-toast";

const GOAL_LABELS: Record<string, { label: string; description: string; example: string }> = {
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

function GoalRow({
  goalType,
  existing,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  goalType: string;
  existing: { amount: string } | undefined;
  onSave: (goalType: string, amount: string) => void;
  onDelete: (goalType: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(existing ? Number(existing.amount).toFixed(2) : "");

  useEffect(() => {
    setValue(existing ? Number(existing.amount).toFixed(2) : "");
    setEditing(false);
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

export function SettingsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editActive, setEditActive] = useState(true);

  const { data: buckets, isLoading } = trpc.buckets.list.useQuery();
  const { data: goalsList, isLoading: goalsLoading } = trpc.goals.list.useQuery();
  const utils = trpc.useUtils();

  const initMutation = trpc.buckets.initializeDefaults.useMutation({
    onSuccess: () => {
      utils.buckets.list.invalidate();
      toast.success("Initialized default buckets");
    }
  });

  const updateMutation = trpc.buckets.update.useMutation({
    onSuccess: () => {
      utils.buckets.list.invalidate();
      setEditingId(null);
      toast.success("Bucket updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update bucket");
    }
  });

  const upsertGoalMutation = trpc.goals.upsert.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      utils.performance.stats.invalidate();
      toast.success("Goal saved");
    },
    onError: (err) => toast.error(err.message || "Failed to save goal"),
  });

  const deleteGoalMutation = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      utils.performance.stats.invalidate();
      toast.success("Goal removed");
    },
    onError: (err) => toast.error(err.message || "Failed to remove goal"),
  });

  const handleEdit = (b: any) => {
    setEditingId(b.id);
    setEditLabel(b.label);
    setEditBudget(b.budgetAmount);
    setEditActive(b.isActive);
  };

  const handleSave = (id: string) => {
    updateMutation.mutate({ id, label: editLabel, budgetAmount: editBudget, isActive: editActive });
  };

  const goalsMap = new Map(goalsList?.map((g: any) => [g.goalType, g]) ?? []);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your trading buckets, limits, and profit goals.</p>
      </div>

      {/* Profit Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Goals</CardTitle>
          <CardDescription>Set monthly and yearly profit targets to track your progress on the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {goalsLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["monthly_profit", "yearly_profit"].map((type) => (
                <GoalRow
                  key={type}
                  goalType={type}
                  existing={goalsMap.get(type) as any}
                  onSave={(gt, amount) => upsertGoalMutation.mutate({ goalType: gt as any, amount })}
                  onDelete={(gt) => deleteGoalMutation.mutate({ goalType: gt as any })}
                  isSaving={upsertGoalMutation.isPending}
                  isDeleting={deleteGoalMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade Buckets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trade Buckets</CardTitle>
              <CardDescription>Allocate capital portions mapped to your trading horizons.</CardDescription>
            </div>
            {buckets?.length === 0 && (
              <Button
                variant="outline"
                onClick={() => initMutation.mutate()}
                disabled={initMutation.isPending}
              >
                {initMutation.isPending ? <Loader2 className="mr-2 animate-spin" /> : null}
                Initialize Defaults
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
            </div>
          ) : buckets?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No buckets configured. Initialize defaults to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buckets?.map(b => (
                <div key={b.id} className="border p-4 rounded-lg flex flex-col gap-4 bg-card shadow-sm">
                  {editingId === b.id ? (
                    <>
                      <div className="grid gap-2">
                        <Label>Label</Label>
                        <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Budget Amount</Label>
                        <Input type="number" step="0.01" value={editBudget} onChange={e => setEditBudget(e.target.value)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Active Status</Label>
                        <Switch checked={editActive} onCheckedChange={setEditActive} />
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button size="sm" onClick={() => handleSave(b.id)} disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{b.label}</h3>
                            {!b.isActive && (
                              <span className="text-[10px] uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Archived</span>
                            )}
                          </div>
                          <p className="text-sm font-mono text-muted-foreground">Budget: ${Number(b.budgetAmount).toLocaleString()}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(b)}>Edit</Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
