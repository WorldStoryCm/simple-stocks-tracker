"use client";

import { AccountSection } from "./components/AccountSection";
import { CapitalProgressSection } from "./components/CapitalProgressSection";
import { ProfitGoalsSection } from "./components/ProfitGoalsSection";

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and configure profit and capital targets.</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Account
        </h2>
        <AccountSection />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          App
        </h2>
        <CapitalProgressSection />
        <ProfitGoalsSection />
      </section>
    </div>
  );
}
