"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/button";
import { Dialog, DialogContent } from "@/components/dialog";
import { NewCaseForm } from "@/components/shadow/NewCaseForm";
import { CasesTable } from "@/components/shadow/CasesTable";
import { RightRail } from "@/components/shadow/RightRail";

export function ShadowPage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shadow Trading</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track ideas, review outcomes, learn from misses</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New Case
        </Button>
      </div>

      {/* Main content */}
      <div className="flex gap-4 flex-1 min-h-0 pb-2">
        <div className="flex-1 min-w-0 flex flex-col">
          <CasesTable />
        </div>
        <div className="w-[256px] shrink-0 flex flex-col">
          <RightRail />
        </div>
      </div>

      {/* New Case Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          accessibleTitle="New Shadow Case"
          className="max-w-[600px] w-full p-0 gap-0 overflow-hidden"
        >
          <NewCaseForm onCreated={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
