"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/Form";
import { Input } from "@/components/input";
import toast from "react-hot-toast";

const formSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(10).toUpperCase(),
  displayName: z.string().optional(),
  exchange: z.string().optional(),
  currencyCode: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol?: any;
}

export function SymbolDialog({ open, onOpenChange, symbol }: Props) {
  const isEditing = !!symbol;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticker: "",
      displayName: "",
      exchange: "",
      currencyCode: "USD",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (symbol) {
        form.reset({
          ticker: symbol.ticker,
          displayName: symbol.displayName || "",
          exchange: symbol.exchange || "",
          currencyCode: symbol.currencyCode || "USD",
          notes: symbol.notes || "",
        });
      } else {
        form.reset({
          ticker: "",
          displayName: "",
          exchange: "",
          currencyCode: "USD",
          notes: "",
        });
      }
    }
  }, [open, symbol, form]);

  const utils = trpc.useUtils();
  
  const createMutation = trpc.symbols.create.useMutation({
    onSuccess: () => {
      toast.success("Symbol added");
      utils.symbols.list.invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add symbol");
    }
  });

  const updateMutation = trpc.symbols.update.useMutation({
    onSuccess: () => {
      toast.success("Symbol updated");
      utils.symbols.list.invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update symbol");
    }
  });

  const onSubmit = (values: FormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: symbol.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader title={isEditing ? "Edit Symbol" : "Add Symbol"} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="ticker"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticker</FormLabel>
                  <FormControl>
                    <Input placeholder="AAPL, TSLA, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company / Asset Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Apple Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange</FormLabel>
                    <FormControl>
                      <Input placeholder="NASDAQ, NYSE..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currencyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="USD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Symbol"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
