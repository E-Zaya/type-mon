"use client";

import Link from "next/link";
import type { PlanView } from "@/lib/use-plan";

/* "2 left today" next to the polish button. The number is the whole message;
   a member sees the month, a guest sees the day. */
export default function UsageChip({ plan, className = "" }: { plan: PlanView | null; className?: string }) {
  if (!plan) return null;
  const empty = plan.remaining <= 0;
  const period = plan.window === "day" ? "Өнөөдөр" : "Энэ сард";
  const label = empty ? `${period} дууссан` : `${period} ${plan.remaining} үлдсэн`;
  const tone = empty
    ? "text-red-600 dark:text-red-400 border-red-500/30"
    : plan.remaining <= 3 && plan.tier !== "plus"
    ? "text-amber-700 dark:text-amber-400 border-amber-500/30"
    : "text-black/55 dark:text-white/55 border-black/10 dark:border-white/10";

  const chip = (
    <span className={`inline-flex items-center gap-1 min-h-[24px] px-2 rounded-md border text-[11px] tabular-nums ${tone} ${className}`}>
      {plan.tier === "plus" && <span className="text-[#1D9E75]">Plus</span>}
      {label}
    </span>
  );

  // The chip is also the shortest path to the next tier.
  if (plan.tier === "guest") return <Link href="/login" title="Нэвтэрвэл сард 30 удаа">{chip}</Link>;
  if (plan.tier === "free") return <Link href="/plus" title="Plus: сард 1,000 удаа">{chip}</Link>;
  return chip;
}
