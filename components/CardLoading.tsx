"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/components/component.utils";

export function CardLoading({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center overflow-hidden rounded-[inherit] bg-[color:var(--surface-1)]/55 backdrop-blur-[1px]",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute -inset-[50%] animate-card-loading-sweep [background:linear-gradient(135deg,transparent_42%,color-mix(in_oklab,var(--brand-from)_14%,transparent)_50%,transparent_58%)]"
      />
      <Loader2
        strokeWidth={2.5}
        className="relative h-8 w-8 animate-spin text-[color:var(--brand-from)]"
      />
    </div>
  );
}
