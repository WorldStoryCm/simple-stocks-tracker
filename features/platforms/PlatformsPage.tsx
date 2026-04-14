"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Loader2, Plus, MoreHorizontal, ArrowDownToLine, ArrowUpFromLine, Wallet } from "lucide-react";
import { PlatformDialog } from "@/components/platforms/PlatformDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/dialog";
import { formatAmount } from "@/lib/currency";
import toast from "react-hot-toast";

type AdjustMode = { platform: any; type: "deposit" | "withdrawal" } | null;

function CashAdjustDialog({
  mode,
  onClose,
}: {
  mode: AdjustMode;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const utils = trpc.useUtils();

  const mutation = trpc.platforms.adjustCash.useMutation({
    onSuccess: (updated) => {
      utils.platforms.list.invalidate();
      toast.success(
        `${mode?.type === "deposit" ? "Deposited" : "Withdrew"} ${formatAmount(Number(amount), updated.currencyCode)} — new balance: ${formatAmount(Number(updated.cashBalance), updated.currencyCode)}`
      );
      setAmount("");
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to adjust balance"),
  });

  if (!mode) return null;
  const isDeposit = mode.type === "deposit";
  const currency = mode.platform.currencyCode;

  return (
    <Dialog open={!!mode} onOpenChange={(o) => { if (!o) { setAmount(""); onClose(); } }}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader
          title={isDeposit ? `Deposit Cash — ${mode.platform.name}` : `Withdraw Cash — ${mode.platform.name}`}
        />
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 border px-4 py-3">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Current balance
            </span>
            <span className="font-bold">{formatAmount(Number(mode.platform.cashBalance), currency)}</span>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              {isDeposit ? "Amount to deposit" : "Amount to withdraw"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$"}
              </span>
              <Input
                autoFocus
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && amount) mutation.mutate({ id: mode.platform.id, amount, type: mode.type }); }}
              />
            </div>
            {!isDeposit && amount && Number(amount) > Number(mode.platform.cashBalance) && (
              <p className="text-xs text-amber-500 mt-1">
                Amount exceeds balance — will withdraw all available cash.
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={() => { setAmount(""); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate({ id: mode.platform.id, amount, type: mode.type })}
            disabled={!amount || Number(amount) <= 0 || mutation.isPending}
            className={isDeposit ? "" : "bg-amber-500 hover:bg-amber-600 text-white"}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isDeposit ? "Deposit" : "Withdraw"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlatformsPage() {
  const { data: platforms, isLoading } = trpc.platforms.list.useQuery();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<any>(null);
  const [adjustMode, setAdjustMode] = useState<AdjustMode>(null);

  const handleEdit = (platform: any) => {
    setEditingPlatform(platform);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPlatform(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platforms</h1>
          <p className="text-muted-foreground mt-1">Manage your trading accounts, balances, and brokers.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Platform
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Cash Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : platforms?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No platforms configured yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              platforms?.map((platform: any) => {
                const balance = Number(platform.cashBalance ?? 0);
                return (
                  <TableRow key={platform.id}>
                    <TableCell className="font-medium">{platform.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{platform.currencyCode}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-bold tabular-nums ${balance > 0 ? "text-green-500" : "text-muted-foreground"}`}>
                          {formatAmount(balance, platform.currencyCode)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-500 hover:bg-green-500/10"
                            title="Deposit cash"
                            onClick={() => setAdjustMode({ platform, type: "deposit" })}
                          >
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-amber-600 hover:text-amber-500 hover:bg-amber-500/10"
                            title="Withdraw cash"
                            onClick={() => setAdjustMode({ platform, type: "withdrawal" })}
                          >
                            <ArrowUpFromLine className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          platform.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {platform.isActive ? "Active" : "Archived"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setAdjustMode({ platform, type: "deposit" })}>
                            <ArrowDownToLine className="mr-2 h-4 w-4 text-green-500" /> Deposit Cash
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAdjustMode({ platform, type: "withdrawal" })}>
                            <ArrowUpFromLine className="mr-2 h-4 w-4 text-amber-500" /> Withdraw Cash
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(platform)}>
                            Edit Platform
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PlatformDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        platform={editingPlatform}
      />

      <CashAdjustDialog mode={adjustMode} onClose={() => setAdjustMode(null)} />
    </div>
  );
}
