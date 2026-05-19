"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/card";
import toast from "react-hot-toast";
import { GoalRow, GOAL_TYPES, type GoalType } from "./GoalRow";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/app/server/routers/_app";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Goal = RouterOutputs["goals"]["list"][number];

export function ProfitGoalsSection() {
  const { data: goalsList, isLoading: goalsLoading } = trpc.goals.list.useQuery();
  const utils = trpc.useUtils();

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

  const goalsMap = new Map<GoalType, Goal>(
    (goalsList ?? []).map((goal) => [goal.goalType as GoalType, goal]),
  );

  return (
    <Card loading={goalsLoading}>
      <CardHeader>
        <CardTitle>Profit Goals</CardTitle>
        <CardDescription>Set monthly and yearly profit targets to track your progress on the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        {goalsLoading ? (
          <div className="min-h-[140px]" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GOAL_TYPES.map((type) => (
              <GoalRow
                key={type}
                goalType={type}
                existing={goalsMap.get(type)}
                onSave={(gt, amount) => upsertGoalMutation.mutate({ goalType: gt, amount })}
                onDelete={(gt) => deleteGoalMutation.mutate({ goalType: gt })}
                isSaving={upsertGoalMutation.isPending}
                isDeleting={deleteGoalMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
