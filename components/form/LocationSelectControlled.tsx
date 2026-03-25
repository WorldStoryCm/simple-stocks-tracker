"use client";

import { useMemo } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { useWorkspaceId } from "@/lib/workspace-context";
import { trpc } from "@/lib/trpc";
import { buildLocationOptions } from "@/lib/location-tree";
import { LocationOptionRow } from "@/components/LocationOptionRow";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/Form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";

interface LocationSelectControlledProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function LocationSelectControlled<TFieldValues extends FieldValues>({
  name,
  label = "Storage",
  placeholder = "Select storage",
  disabled,
}: LocationSelectControlledProps<TFieldValues>) {
  const WORKSPACE_ID = useWorkspaceId();
  const { data: locations } = trpc.locations.list.useQuery({ workspaceId: WORKSPACE_ID });
  const options = useMemo(() => buildLocationOptions((locations ?? []) as any[]), [locations]);

  if (options.length === 0) return null;

  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  <LocationOptionRow opt={opt} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
