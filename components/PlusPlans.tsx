"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { usePlan } from "@/lib/use-plan";
import { PRICES_MNT, formatMnt, type PlanCode } from "@/lib/plan-constants";

/* Two prices, one button each. The button knows whether the visitor is
   signed in and where it must send them; the annual card says in months
   what the discount is worth. */
export default function PlusPlans() {
  const { signedIn, mode } = useAuth();
  const { plan } = usePlan();
  const isPlus = plan?.tier === "plus";
  const monthsFree = Math.round(12 - PRICES_MNT.annual / PRICES_MNT.monthly);

  function href(code: PlanCode) {
    const target = `/plus/checkout?plan=${code}`;
    return signedIn ? target : `/login?next=${encodeURIComponent(target)}`;
  }

  const cards: { code: PlanCode; title: string; price: string; per: string; note: string; featured: boolean }[] = [
    { code: "monthly", title: "Сар бүр", price: formatMnt(PRICES_MNT.monthly), per: "/ сар", note: "Хүссэн үедээ зогсооно.", featured: false },
    { code: "annual", title: "Жилээр", price: formatMnt(PRICES_MNT.annual), per: "/ жил", note: `${monthsFree} сар үнэгүйтэй тэнцэнэ.`, featured: true },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((card) => (
        <div
          key={card.code}
          className={`
            relative rounded-2xl p-5 md:p-6
            border transition-colors duration-200
            ${card.featured
              ? "bg-[#1D9E75]/[0.06] border-[#1D9E75]/40"
              : "bg-[#eeede8] dark:bg-[#242424] border-black/8 dark:border-white/10"}
          `}
        >
          {card.featured && (
            <span className="absolute -top-2.5 left-5 px-2 py-0.5 rounded-md bg-[#1D9E75] text-white text-[10px] uppercase tracking-widest">
              Хамгийн ашигтай
            </span>
          )}
          <div className="text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50">{card.title}</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-light tracking-tight text-black dark:text-white tabular-nums">{card.price}</span>
            <span className="text-sm text-black/50 dark:text-white/50">{card.per}</span>
          </div>
          <p className="mt-1 text-sm text-black/65 dark:text-white/65">{card.note}</p>

          {mode === "unconfigured" ? (
            <p className="mt-5 text-xs text-black/50 dark:text-white/50">Төлбөр энэ орчинд идэвхгүй.</p>
          ) : isPlus ? (
            <p className="mt-5 inline-flex items-center min-h-[44px] text-sm text-[#1D9E75]">Та Plus хэрэглэгч ✓</p>
          ) : (
            <Link
              href={href(card.code)}
              className={`
                mt-5 inline-flex w-full items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${card.featured
                  ? "bg-[#1D9E75] hover:bg-[#178b66] text-white"
                  : "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-black/85 dark:text-white/85"}
              `}
            >
              {signedIn ? "Plus авах" : "Нэвтэрч Plus авах"}
            </Link>
          )}
        </div>
      ))}
      <p className="sm:col-span-2 px-1 text-xs text-black/50 dark:text-white/50">
        QPay-ээр төлнө. Хугацаа дуусахад автоматаар сунгагдахгүй — та өөрөө шийднэ.
      </p>
    </section>
  );
}
