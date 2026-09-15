"use client";

import { useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { PlanView } from "@/lib/use-plan";
import { POLISH_CHARS, POLISH_LIMIT, PRICES_MNT, formatMnt } from "@/lib/plan-constants";

export type PaywallReason = "guest" | "free" | "chars";

type Props = {
  reason: PaywallReason | null;
  plan: PlanView | null;
  onClose: () => void;
};

/* Shown the moment a limit is hit, with exactly one next step. A guest is
   asked to sign in; a member is shown Plus. Nothing is taken away — the
   converter keeps working behind the sheet. */
export default function PaywallSheet({ reason, plan, onClose }: Props) {
  useEffect(() => {
    if (!reason) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reason, onClose]);

  if (typeof document === "undefined") return null;

  const guest = reason === "guest" || (reason === "chars" && plan?.tier === "guest");
  const copy = guest
    ? {
        title: `Өнөөдрийн ${POLISH_LIMIT.guest} үнэгүй засвар дууслаа`,
        body: `Нэвтэрвэл сард ${POLISH_LIMIT.free} удаа засуулна. Нууц үг хэрэггүй — Google эсвэл имэйлийн холбоос.`,
        cta: "Нэвтрэх",
        href: "/login",
        foot: "Хөрвүүлэлт хэвээрээ үнэгүй, хязгааргүй.",
      }
    : reason === "chars"
    ? {
        title: `${POLISH_CHARS.free} тэмдэгтээс урт текст`,
        body: `Plus дээр нэг удаад ${POLISH_CHARS.plus.toLocaleString("en-US")} тэмдэгт хүртэл, сард ${POLISH_LIMIT.plus.toLocaleString("en-US")} удаа засуулна.`,
        cta: `Plus — ${formatMnt(PRICES_MNT.monthly)}/сар`,
        href: "/plus",
        foot: "Эсвэл текстээ хоёр хувааж засуулаарай.",
      }
    : {
        title: `Энэ сарын ${POLISH_LIMIT.free} засвар дууслаа`,
        body: `Plus: сард ${POLISH_LIMIT.plus.toLocaleString("en-US")} удаа, ${POLISH_CHARS.plus.toLocaleString("en-US")} тэмдэгт, өнгө аяс сонгох боломж.`,
        cta: `Plus — ${formatMnt(PRICES_MNT.monthly)}/сар`,
        href: "/plus",
        foot: "Дараагийн сарын 1-нд тоолуур шинээр эхэлнэ.",
      };

  return createPortal(
    <AnimatePresence>
      {reason && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          role="presentation"
        >
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paywall-title"
            className="
              w-full max-w-md
              bg-[#f5f4ef] dark:bg-[#242424]
              border border-black/10 dark:border-white/10
              rounded-2xl p-5 md:p-6 shadow-xl
            "
          >
            <div className="text-[11px] uppercase tracking-widest text-[#1D9E75] mb-2">AI засвар</div>
            <h2 id="paywall-title" className="text-xl font-light tracking-tight text-black dark:text-white">{copy.title}</h2>
            <p className="mt-2 text-sm text-black/70 dark:text-white/70">{copy.body}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={copy.href}
                className="
                  inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg
                  bg-[#1D9E75] hover:bg-[#178b66] text-white text-sm font-medium
                  transition-colors duration-150
                "
              >
                {copy.cta}
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="
                  inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg
                  bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
                  border border-black/10 dark:border-white/10
                  text-sm text-black/80 dark:text-white/80
                  transition-colors duration-150
                "
              >
                Дараа
              </button>
            </div>
            <p className="mt-4 text-xs text-black/50 dark:text-white/50">{copy.foot}</p>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
