"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Loader2, Plus, MoreHorizontal, RefreshCw } from "lucide-react";
import { SymbolDialog } from "@/components/symbols/SymbolDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/dropdown-menu";
import toast from "react-hot-toast";

export function SymbolsPage() {
  const { data: symbols, isLoading } = trpc.symbols.list.useQuery();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<any>(null);

  const utils = trpc.useUtils();
  const enrichAll = trpc.symbols.enrichAll.useMutation({
    onSuccess: (result) => {
      toast.success(`Refreshed ${result.updated}/${result.total} symbols${result.failed ? ` (${result.failed} failed)` : ""}`);
      utils.symbols.list.invalidate();
      utils.performance.stats.invalidate();
    },
    onError: (err) => toast.error(`Refresh failed: ${err.message}`),
  });

  const handleEdit = (symbol: any) => {
    setEditingSymbol(symbol);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingSymbol(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Symbols</h1>
          <p className="text-muted-foreground mt-1">Manage the stocks and assets you trade.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => enrichAll.mutate()} disabled={enrichAll.isPending || !symbols?.length}>
            {enrichAll.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh metadata
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Symbol
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Sector</TableHead>
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
            ) : symbols?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No symbols tracked yet. Add one to start logging trades.
                </TableCell>
              </TableRow>
            ) : (
              symbols?.slice().sort((a: any, b: any) => a.ticker.localeCompare(b.ticker)).map((sym: any) => (
                <TableRow key={sym.id}>
                  <TableCell className="font-bold">{sym.ticker}</TableCell>
                  <TableCell>{sym.displayName || "-"}</TableCell>
                  <TableCell>{sym.exchange || "-"}</TableCell>
                  <TableCell>{sym.sector || <span className="text-muted-foreground italic">Unclassified</span>}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(sym)}>
                          Edit Symbol
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SymbolDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        symbol={editingSymbol}
      />
    </div>
  );
}
