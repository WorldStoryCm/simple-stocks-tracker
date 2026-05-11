"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/button";
import { TradeDialog } from "@/components/trades/TradeDialog";
import { cn } from "@/components/component.utils";

type Props = {
  variant?: "default" | "outline" | "ghost" | "icon";
  size?: "default" | "sm" | "icon";
  className?: string;
  label?: string;
};

export function AddTradeButton({
  variant = "default",
  size = "default",
  className,
  label = "Add Trade",
}: Props) {
  const [open, setOpen] = useState(false);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <>
      <Button
        variant={variant as any}
        size={size as any}
        className={cn(className)}
        onClick={() => setOpen(true)}
      >
        <Plus className={cn("mr-1.5", iconSize)} />
        {label}
      </Button>
      <TradeDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
