"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { announcePlanChange } from "@/lib/use-plan";
import { PLAN_DAYS, PRICES_MNT, formatMnt, type PlanCode } from "@/lib/plan-constants";

type Order = {
  orderId: string;
  planCode: PlanCode;
  amountMnt: number;
  expiresAt: string;
  qrSvg: string;
  qrTarget: string;
  provider: "demo" | "qpay";
};

type State =
  | { kind: "loading" }
  | { kind: "order"; order: Order }
  | { kind: "confirming"; order: Order | null }
  | { kind: "done"; periodEnd: string | null }
  | { kind: "error"; message: string };

function isPlan(value: string | null): value is PlanCode {
  return value === "monthly" || value === "annual";
}

/* Creates the order, draws the QR, and confirms. With QPay the confirm
   step is replaced by polling the order until the provider callback marks
   it paid; the screen states stay the same. */
export default function PlusCheckout() {
  const params = useSearchParams();
  const planParam = params?.get("plan") ?? null;
  const confirmParam = params?.get("confirm") ?? null;
  const plan: PlanCode = isPlan(planParam) ? planParam : "monthly";
  const { ready, signedIn, mode } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  const started = useRef(false);

  const confirm = useCallback(async (orderId: string, order: Order | null) => {
    setState({ kind: "confirming", order });
    const response = await fetch("/api/billing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const body = (await response.json().catch(() => null)) as { activated?: boolean; periodEnd?: string | null; reason?: string } | null;
    if (response.ok && body?.activated) {
      announcePlanChange();
      setState({ kind: "done", periodEnd: body.periodEnd ?? null });
      return;
    }
    const reason = body?.reason;
    setState({
      kind: "error",
      message:
        reason === "expired"
          ? "Захиалгын хугацаа дууссан байна. Дахин эхлүүлнэ үү."
          : reason === "order_not_found"
          ? "Захиалга олдсонгүй."
          : "Баталгаажуулж чадсангүй. Дахин оролдоно уу.",
    });
  }, []);

  useEffect(() => {
    if (!ready || !signedIn || mode === "unconfigured" || started.current) return;
    started.current = true;

    // Arrived by scanning the QR: confirm that order directly. Deferred a
    // tick so the first state change happens outside the effect body.
    if (confirmParam) {
      const id = confirmParam;
      window.queueMicrotask(() => void confirm(id, null));
      return;
    }

    fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as Order | { error?: string } | null;
        if (!response.ok || !body || !("orderId" in body)) {
          const code = body && "error" in body ? body.error : undefined;
          setState({
            kind: "error",
            message: code === "SCHEMA_NOT_READY" ? "Төлбөрийн систем бэлэн болоогүй байна." : "Захиалга үүсгэж чадсангүй.",
          });
          return;
        }
        setState({ kind: "order", order: body });
      })
      .catch(() => setState({ kind: "error", message: "Сүлжээний алдаа гарлаа." }));
  }, [ready, signedIn, mode, plan, confirmParam, confirm]);

  if (mode === "unconfigured") return <Note>Төлбөр энэ орчинд идэвхгүй байна.</Note>;
  if (!ready) return <Note>Ачаалж байна…</Note>;
  if (!signedIn) {
    return (
      <Note>
        Эхлээд нэвтэрнэ үү.{" "}
        <Link href={`/login?next=${encodeURIComponent(`/plus/checkout?plan=${plan}`)}`} className="text-[#1D9E75] hover:underline">
          Нэвтрэх →
        </Link>
      </Note>
    );
  }

  if (state.kind === "done") {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <div className="w-16 h-16 grid place-items-center rounded-full bg-[#1D9E75]/15 text-[#1D9E75] text-3xl">✓</div>
        <h2 className="text-2xl font-light tracking-tight text-black dark:text-white">Та одоо Plus боллоо</h2>
        <p className="text-sm text-black/65 dark:text-white/65">
          {state.periodEnd ? `${new Date(state.periodEnd).toLocaleDateString("mn-MN")} хүртэл.` : ""} Сард 1,000 засвар, 2,000 тэмдэгт, өнгө аяс, өөрийн дүрэм — бүгд нээлттэй.
        </p>
        <Link href="/" className="mt-2 inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg bg-[#1D9E75] hover:bg-[#178b66] text-white text-sm font-medium transition-colors duration-150">
          Бичиж эхлэх
        </Link>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{state.message}</p>
        <Link href="/plus" className="text-sm text-[#1D9E75] hover:underline">← Багц руу буцах</Link>
      </div>
    );
  }

  const order = state.kind === "order" ? state.order : state.kind === "confirming" ? state.order : null;
  const amount = order?.amountMnt ?? PRICES_MNT[plan];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
      <div className="mx-auto md:mx-0 w-52 h-52 p-3 rounded-2xl bg-white border border-black/10 grid place-items-center">
        {order ? (
          <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: order.qrSvg }} />
        ) : (
          <div className="w-full h-full rounded-lg bg-black/5 animate-pulse" />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50">
          {plan === "annual" ? "Жилээр" : "Сар бүр"} · {PLAN_DAYS[plan]} хоног
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-light tracking-tight text-black dark:text-white tabular-nums">{formatMnt(amount)}</span>
        </div>
        <p className="text-sm text-black/65 dark:text-white/65">
          Банкныхаа аппаар QR-ийг уншуулна. Төлбөр орсны дараа Plus шууд идэвхжинэ.
        </p>
        {order?.provider === "demo" && (
          <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/[0.06] px-3 py-2 text-xs text-black/70 dark:text-white/70">
            Туршилтын горим: QPay холбогдоогүй тул доорх товч төлбөрийн оронд ажиллана.
          </div>
        )}
        <button
          type="button"
          disabled={!order || state.kind === "confirming"}
          onClick={() => order && confirm(order.orderId, order)}
          className="
            self-start inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg
            bg-[#1D9E75] hover:bg-[#178b66] text-white text-sm font-medium
            transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {state.kind === "confirming" ? "Шалгаж байна…" : "Төлбөр төлсөн"}
        </button>
        {order && (
          <p className="text-xs text-black/45 dark:text-white/45">
            Захиалга {new Date(order.expiresAt).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })} хүртэл хүчинтэй.
          </p>
        )}
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-black/65 dark:text-white/65">{children}</p>;
}
