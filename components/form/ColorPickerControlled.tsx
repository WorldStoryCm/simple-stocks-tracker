"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/Form";
import { cn } from "@/components/component.utils";
import type { FieldPath, FieldValues } from "react-hook-form";

export interface ColorPickerControlledProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  label?: string;
  className?: string;
  defaultColor?: string;
}

export function ColorPickerControlled<TFieldValues extends FieldValues>({
  name,
  label,
  className,
  defaultColor = "#78716c",
}: ColorPickerControlledProps<TFieldValues>) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex flex-col", className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer">
                <span
                  className="block h-8 w-8 rounded-full border border-input shadow-sm transition-shadow hover:shadow-md"
                  style={{ backgroundColor: field.value || defaultColor }}
                />
                <input
                  type="color"
                  value={field.value || defaultColor}
                  onChange={field.onChange}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label={label || "Pick a color"}
                />
              </label>
              <span className="text-sm text-muted-foreground font-mono">
                {field.value || defaultColor}
              </span>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
