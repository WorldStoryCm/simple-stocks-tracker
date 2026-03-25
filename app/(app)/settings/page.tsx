"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/card";
import { Input } from "@/components/input";
import { Switch } from "@/components/switch";
import { Label } from "@/components/label";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editActive, setEditActive] = useState(true);

  const { data: buckets, isLoading } = trpc.buckets.list.useQuery();
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

  const handleEdit = (b: any) => {
    setEditingId(b.id);
    setEditLabel(b.label);
    setEditBudget(b.budgetAmount);
    setEditActive(b.isActive);
  };

  const handleSave = (id: string) => {
    updateMutation.mutate({
      id,
      label: editLabel,
      budgetAmount: editBudget,
      isActive: editActive,
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your trading buckets and limits.</p>
      </div>

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
      
      {/* Space for base currency settings and global goals */}
    </div>
  );
}
