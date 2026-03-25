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
  DialogTitle,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import toast from "react-hot-toast";

const formSchema = z.object({
  platformId: z.string().min(1, "Broker is required"),
  symbolId: z.string().min(1, "Symbol is required"),
  bucketId: z.string().min(1, "Bucket is required"),
  tradeType: z.enum(["buy", "sell"]),
  tradeDate: z.string().min(1, "Date is required"),
  quantity: z.string().min(1, "Quantity is required"),
  price: z.string().min(1, "Price is required"),
  fee: z.string().default("0"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TradeDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: symbols } = trpc.symbols.list.useQuery();
  const { data: buckets } = trpc.buckets.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platformId: "",
      symbolId: "",
      bucketId: "",
      tradeType: "buy",
      tradeDate: new Date().toISOString().split('T')[0],
      quantity: "",
      price: "",
      fee: "0",
      notes: "",
    },
  });

  const utils = trpc.useUtils();
  
  const createMutation = trpc.trades.create.useMutation({
    onSuccess: () => {
      toast.success("Trade recorded");
      utils.trades.list.invalidate();
      utils.positions.list.invalidate();
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to record trade");
    }
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const isPending = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-screen">
        <DialogHeader>
          <DialogTitle>Record Trade</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tradeType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Buy or Sell" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="tradeDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="platformId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Broker</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select broker" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {platforms?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="symbolId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select symbol" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {symbols?.map(s => <SelectItem key={s.id} value={s.id}>{s.ticker}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="bucketId" render={({ field }) => (
              <FormItem>
                <FormLabel>Capital Bucket</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select bucket" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {buckets?.map(b => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl><Input type="number" step="0.0001" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price</FormLabel>
                  <FormControl><Input type="number" step="0.0001" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="fee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Fee</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Recording..." : "Record Trade"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
