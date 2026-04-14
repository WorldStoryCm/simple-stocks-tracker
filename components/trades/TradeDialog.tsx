"use client";

import { useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Calculator } from "lucide-react";
import toast from "react-hot-toast";

const formSchema = z.object({
  platformId: z.string().min(1, "Broker is required"),
  symbolId: z.string().min(1, "Symbol is required"),
  newTicker: z.string().optional(),
  bucketId: z.string().optional(),
  tradeType: z.enum(["buy", "sell"]),
  tradeDate: z.string().min(1, "Date is required"),
  quantity: z.string().min(1, "Quantity is required"),
  price: z.string().min(1, "Price is required"),
  total: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.symbolId !== "new" || !!data.newTicker, {
  message: "New ticker is required",
  path: ["newTicker"]
});

type FormValues = z.infer<typeof formSchema>;

export function TradeDialog({ open, onOpenChange, trade }: { open: boolean, onOpenChange: (open: boolean) => void, trade?: any }) {
  const isEditing = !!(trade && trade.id);
  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: symbols } = trpc.symbols.list.useQuery();
  const { data: buckets } = trpc.buckets.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platformId: "",
      symbolId: "",
      newTicker: "",
      bucketId: "",
      tradeType: "buy",
      tradeDate: new Date().toISOString().split('T')[0],
      quantity: "",
      price: "",
      total: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (trade) {
        form.reset({
          platformId: trade.platformId || "",
          symbolId: trade.symbolId || "",
          newTicker: "",
          bucketId: trade.bucketId || "",
          tradeType: trade.tradeType || "buy",
          tradeDate: trade.tradeDate ? new Date(trade.tradeDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          quantity: trade.quantity || "",
          price: trade.price || "",
          total: trade.quantity && trade.price ? (parseFloat(trade.quantity) * parseFloat(trade.price)).toFixed(2) : "",
          notes: trade.notes || "",
        });
      } else {
        form.reset({
          platformId: "",
          symbolId: "",
          newTicker: "",
          bucketId: "",
          tradeType: "buy",
          tradeDate: new Date().toISOString().split('T')[0],
          quantity: "",
          price: "",
          total: "",
          notes: "",
        });
      }
    }
  }, [open, trade, form]);

  const utils = trpc.useUtils();
  
  const [submitMode, setSubmitMode] = useState<"close" | "add-another">("close");

  const createTradeMutation = trpc.trades.create.useMutation({
    onSuccess: () => {
      toast.success("Trade recorded");
      utils.trades.list.invalidate();
      utils.positions.list.invalidate();
      
      if (submitMode === "close") {
        onOpenChange(false);
      } else {
        form.setValue("quantity", "");
        form.setValue("price", "");
        form.setValue("total", "");
        form.setValue("notes", "");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record trade");
    }
  });

  const updateTradeMutation = trpc.trades.update.useMutation({
    onSuccess: () => {
      toast.success("Trade updated");
      utils.trades.list.invalidate();
      utils.positions.list.invalidate();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update trade");
    }
  });

  const createSymbolMutation = trpc.symbols.create.useMutation();

  const onSubmit = async (values: FormValues) => {
    let finalSymbolId = values.symbolId;
    
    if (values.symbolId === "new" && values.newTicker) {
      try {
        const sym = await createSymbolMutation.mutateAsync({ 
          ticker: values.newTicker.toUpperCase(),
          currencyCode: "USD"
        });
        finalSymbolId = sym.id;
        utils.symbols.list.invalidate();
      } catch (err: any) {
        toast.error("Failed to create new symbol: " + err.message);
        return;
      }
    }

    const payload = {
      platformId: values.platformId,
      symbolId: finalSymbolId,
      bucketId: values.bucketId,
      tradeType: values.tradeType,
      tradeDate: values.tradeDate,
      quantity: values.quantity,
      price: values.price,
      fee: "0",
      notes: values.notes,
    };

    if (isEditing) {
      updateTradeMutation.mutate({ id: trade.id, ...payload });
    } else {
      createTradeMutation.mutate(payload);
    }
  };

  const handleCalculate = () => {
    const q = parseFloat(form.getValues("quantity"));
    const p = parseFloat(form.getValues("price"));
    const t = parseFloat(form.getValues("total") || "0");

    if (q > 0 && p > 0 && !t) {
      form.setValue("total", (q * p).toFixed(2));
    } else if (p > 0 && t > 0 && !q) {
      form.setValue("quantity", (t / p).toFixed(4));
    } else if (q > 0 && t > 0 && !p) {
      form.setValue("price", (t / q).toFixed(4));
    } else if (q > 0 && p > 0 && t > 0) {
      form.setValue("total", (q * p).toFixed(2));
      toast.success("Recalculated total");
    } else {
      toast.error("Enter at least two values to calculate the third");
    }
  };

  const isPending = createTradeMutation.isPending || updateTradeMutation.isPending || createSymbolMutation.isPending;
  const watchTradeType = form.watch("tradeType");
  const watchPlatformId = form.watch("platformId");
  const watchSymbol = form.watch("symbolId");

  const selectedPlatformCurrency = platforms?.find((p: any) => p.id === watchPlatformId)?.currencyCode || null;

  const { data: openQty } = trpc.trades.getOpenQuantity.useQuery(
    { platformId: watchPlatformId, symbolId: watchSymbol },
    { enabled: watchTradeType === "sell" && !!watchPlatformId && !!watchSymbol && watchSymbol !== "new" }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-screen">
        <DialogHeader title={isEditing ? "Edit Trade" : "Record Trade"} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tradeType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select broker" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {platforms?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="space-y-2">
                <FormField control={form.control} name="symbolId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select symbol" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="new" className="text-primary font-medium">+ Add New Symbol</SelectItem>
                        {symbols?.slice().sort((a: any, b: any) => a.ticker.localeCompare(b.ticker)).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.ticker}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {watchSymbol === "new" && (
                  <FormField control={form.control} name="newTicker" render={({ field }) => (
                    <FormItem>
                      <FormControl><Input placeholder="New Ticker (e.g. AAPL)" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
            </div>

            <FormField control={form.control} name="bucketId" render={({ field }) => (
              <FormItem>
                <FormLabel>Capital Bucket</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select bucket" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {buckets?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {selectedPlatformCurrency && selectedPlatformCurrency !== 'USD' && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border rounded-md px-3 py-1.5">
                <span className="font-medium text-foreground">{selectedPlatformCurrency}</span>
                <span>Prices for this broker are recorded in {selectedPlatformCurrency}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    Quantity
                    {watchTradeType === "sell" && openQty !== undefined && openQty > 0 && (
                      <button 
                        type="button" 
                        onClick={() => form.setValue("quantity", openQty.toString())}
                        className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md font-semibold hover:bg-orange-500/20 active:bg-orange-500/30 transition-colors"
                        title="Sell all remaining open quantity for this Broker & Symbol"
                      >
                        Sell All: {openQty.toFixed(4).replace(/\.?0+$/, '')}
                      </button>
                    )}
                  </FormLabel>
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

              <FormField control={form.control} name="total" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    Total Volume
                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted" onClick={handleCalculate} aria-label="Calculate">
                      <Calculator className="h-3 w-3" />
                    </Button>
                  </FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:space-x-0 sm:justify-between items-center w-full">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {!isEditing && (
                  <Button 
                    type="submit" 
                    variant="outline"
                    disabled={isPending}
                    onClick={() => setSubmitMode("add-another")}
                  >
                    {isPending && submitMode === "add-another" ? "Recording..." : "Record & Add Another"}
                  </Button>
                )}
                <Button 
                  type="submit" 
                  disabled={isPending}
                  onClick={() => setSubmitMode("close")}
                >
                  {isPending && submitMode === "close" ? (isEditing ? "Updating..." : "Recording...") : (isEditing ? "Update Trade" : "Record Trade")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
