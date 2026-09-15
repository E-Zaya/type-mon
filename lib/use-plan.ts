"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanView } from "@/app/api/billing/entitlements/route";

export type { PlanView };

export const PLAN_EVENT = "typemon-plan-change";

/** What the current visitor may do, refreshed whenever a polish or a purchase changes it. */
export function usePlan() {
  const [plan, setPlan] = useState<PlanView | null>(null);

  const reload = useCallback(() => {
    fetch("/api/billing/entitlements", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: PlanView | null) => setPlan(body && typeof body.limit === "number" ? body : null))
      .catch(() => setPlan(null));
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener(PLAN_EVENT, reload);
    return () => window.removeEventListener(PLAN_EVENT, reload);
  }, [reload]);

  return { plan, reload };
}

/** Tells every mounted screen that the plan or the usage changed. */
export function announcePlanChange() {
  window.dispatchEvent(new Event(PLAN_EVENT));
}
