"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Textarea } from "@/components/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { TrendingUp, TrendingDown, Eye, Loader2 } from "lucide-react";
import { cn } from "@/components/component.utils";
import toast from "react-hot-toast";
import { format } from "date-fns";

const schema = z.object({
  symbol: z.string().min(1, "Required").max(12),
  direction: z.enum(["up", "down", "watch"]),
  thesis: z.string().min(1, "Required"),
  confidence: z.string().optional(),
  timeHorizon: z.string().optional(),
  startedAt: z.string().min(1, "Required"),
  entryPrice: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

const directionOptions = [
  { value: "up", label: "Bullish", icon: TrendingUp, color: "text-green-500" },
  { value: "down", label: "Bearish", icon: TrendingDown, color: "text-red-500" },
  { value: "watch", label: "Watch", icon: Eye, color: "text-muted-foreground" },
] as const;

const horizonOptions = [
  { value: "intraday", label: "Intraday" },
  { value: "swing", label: "Swing (2-5d)" },
  { value: "1w", label: "1 Week" },
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
];

interface NewCaseFormProps {
  onCreated?: () => void;
}

function FormInner({ onCreated }: NewCaseFormProps) {
  const utils = trpc.useUtils();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      direction: "up",
      startedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const direction = watch("direction");

  const createMutation = trpc.shadow.createCase.useMutation({
    onSuccess: () => {
      toast.success("Case started!");
      utils.shadow.listCases.invalidate();
      utils.shadow.getStats.invalidate();
      onCreated?.();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="flex flex-col">
      {/* Modal header */}
      <div className="px-6 py-4 border-b">
        <h2 className="font-semibold text-base">New Shadow Case</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Capture your thesis before the move happens</p>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        {/* Symbol */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Symbol</Label>
          <Input
            {...register("symbol")}
            placeholder="e.g. NVDA"
            className="uppercase placeholder:normal-case font-semibold text-base"
            autoFocus
          />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol.message}</p>}
        </div>

        {/* Direction */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Direction</Label>
          <div className="grid grid-cols-3 gap-2">
            {directionOptions.map(opt => {
              const Icon = opt.icon;
              const isSelected = direction === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("direction", opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 px-2 rounded-md border text-xs font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isSelected && opt.color)} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Entry Price + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Entry Price</Label>
            <Input {...register("entryPrice")} type="number" step="0.0001" placeholder="0.00" />
            {errors.entryPrice && <p className="text-xs text-destructive">{errors.entryPrice.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
            <Input {...register("startedAt")} type="datetime-local" />
          </div>
        </div>

        {/* Horizon + Confidence */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Horizon</Label>
            <Select onValueChange={(v) => setValue("timeHorizon", v)}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {horizonOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Confidence</Label>
            <Select onValueChange={(v) => setValue("confidence", v)}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="1–5" />
              </SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4", "5"].map(v => (
                  <SelectItem key={v} value={v}>{v} / 5</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Thesis */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Why I Took This</Label>
          <Textarea
            {...register("thesis")}
            placeholder="Expected pullback after earnings reaction..."
            rows={4}
            className="resize-none text-sm"
          />
          {errors.thesis && <p className="text-xs text-destructive">{errors.thesis.message}</p>}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t">
        <Button type="submit" disabled={createMutation.isPending} className="w-full">
          {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Start Tracking
        </Button>
      </div>
    </form>
  );
}

export function NewCaseForm({ onCreated }: NewCaseFormProps) {
  // Key-based remount ensures Radix Select state is cleared on each open
  const [formKey, setFormKey] = useState(0);

  const handleCreated = () => {
    setFormKey(k => k + 1);
    onCreated?.();
  };

  return <FormInner key={formKey} onCreated={handleCreated} />;
}
