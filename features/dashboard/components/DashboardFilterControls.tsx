"use client";

import { useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { cn } from "@/components/component.utils";

type FilterPillProps = {
  label: string;
  value?: string;
  active?: boolean;
  children?: React.ReactNode;
  onClear?: () => void;
};

export function FilterPill({ label, value = "All", active, children, onClear }: FilterPillProps) {
  const trigger = (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-[color:var(--brand-from)]/40 bg-[color:var(--brand-from)]/10 text-text-primary"
          : "border-border bg-[color:var(--surface-1)] text-text-secondary hover:bg-[color:var(--surface-2)] hover:text-text-primary",
      )}
    >
      <span className="text-text-tertiary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
      {active && onClear ? (
        <span
          role="button"
          aria-label={`Clear ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onClear();
          }}
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-text-tertiary hover:bg-[color:var(--surface-2)] hover:text-text-primary"
        >
          <X className="h-3 w-3" />
        </span>
      ) : (
        <ChevronDown className="h-3 w-3 text-text-tertiary" />
      )}
    </button>
  );

  if (!children) return trigger;
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] border p-0 shadow-lg">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function ListPicker({
  options,
  selected,
  onSelect,
  placeholder,
}: {
  options: { id: string; label: string }[];
  selected?: string;
  onSelect: (id: string | undefined) => void;
  placeholder: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => (q ? options.filter((option) => option.label.toLowerCase().includes(q.toLowerCase())) : options),
    [options, q],
  );

  return (
    <div className="flex flex-col">
      <div className="border-b px-2 py-1.5">
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={placeholder}
          className="h-8 border-0 bg-transparent px-2 text-sm focus-visible:ring-0"
        />
      </div>
      <div className="max-h-[260px] overflow-y-auto p-1">
        <button
          type="button"
          className={cn(
            "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[color:var(--surface-2)]",
            !selected && "bg-[color:var(--surface-2)]/60 font-medium",
          )}
          onClick={() => onSelect(undefined)}
        >
          All
        </button>
        {filtered.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cn(
              "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[color:var(--surface-2)]",
              selected === option.id && "bg-[color:var(--surface-2)]/60 font-medium",
            )}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-3 text-center text-xs text-text-tertiary">No matches</div>
        )}
      </div>
    </div>
  );
}
