"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  symbolId: z.string().min(1, "Symbol is required"),
  platformId: z.string().optional(),
  targetBuyPrice: z.string().optional(),
  thesis: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function WatchlistDialog() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils?.() || trpc.useContext?.();

  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: symbols } = trpc.symbols.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbolId: "",
      platformId: "none",
      targetBuyPrice: "",
      thesis: "",
      notes: "",
    },
  });

  const createMutation = trpc.watchlist.create.useMutation({
    onSuccess: () => {
      utils.watchlist?.list?.invalidate();
      setOpen(false);
      form.reset();
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    createMutation.mutate({
      ...values,
      platformId: values.platformId === "none" ? undefined : values.platformId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add to Watchlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
          <DialogDescription>
            Track a symbol and set optional target prices and thesis.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="symbolId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a symbol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {symbols?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.ticker} {s.displayName ? `- ${s.displayName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platformId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Any Platform</SelectItem>
                      {platforms?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetBuyPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Buy Price</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thesis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thesis / Rationale</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Why are you watching this?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
