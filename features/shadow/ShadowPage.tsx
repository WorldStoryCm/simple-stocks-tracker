"use client";

import { ShadowKpiRow } from "@/components/shadow/ShadowKpiRow";
import { NewCaseForm } from "@/components/shadow/NewCaseForm";
import { CasesTable } from "@/components/shadow/CasesTable";
import { RightRail } from "@/components/shadow/RightRail";

export function ShadowPage() {
  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shadow Trading</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track ideas, review outcomes, learn from misses</p>
      </div>

      {/* KPI row */}
      <ShadowKpiRow />

      {/* Three-panel layout */}
      <div className="flex gap-4 flex-1 min-h-0 pb-2">
        {/* Left: New Case Form */}
        <div className="w-[280px] shrink-0 flex flex-col">
          <NewCaseForm />
        </div>

        {/* Center: Cases Table */}
        <div className="flex-1 min-w-0 flex flex-col">
          <CasesTable />
        </div>

        {/* Right: Activity Rail */}
        <div className="w-[256px] shrink-0 flex flex-col">
          <RightRail />
        </div>
      </div>
    </div>
  );
}
