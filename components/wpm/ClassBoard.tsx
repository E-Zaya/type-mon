"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { encodeBoard, modeLabel, parseResults, tierFor } from "@/lib/wpm-rank";

const SITE = "https://type-mon.vercel.app";
const noSubscribe = () => () => {};

/**
 * A ranking with no server: everyone pastes their share links, the page
 * reads the results out of them, and the board itself is one link that
 * carries every result. Nothing is stored anywhere.
 */
export default function ClassBoard() {
  const params = useSearchParams();
  const initial = params?.toString() ?? "";
  const [text, setText] = useState(() => (initial ? `/wpm/board?${initial}` : ""));
  const [copied, setCopied] = useState(false);

  const results = useMemo(() => parseResults(text), [text]);
  const ranked = useMemo(() => [...results].sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy), [results]);
  const boardQuery = useMemo(() => encodeBoard(ranked), [ranked]);

  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => undefined);
  const boardUrl = `${origin ?? SITE}/wpm/board${boardQuery ? `?${boardQuery}` : ""}`;

  // Keep the address bar equal to the board, so reload and share both work.
  useEffect(() => {
    const next = `/wpm/board${boardQuery ? `?${boardQuery}` : ""}`;
    if (window.location.pathname + window.location.search !== next) {
      window.history.replaceState({}, "", next);
    }
  }, [boardQuery]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(boardUrl);
      setCopied(true);
      track("board_copy", { players: ranked.length });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the URL is in the address bar */
    }
  }, [boardUrl, ranked.length]);

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50">
          Холбоосуудаа энд буулга
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          spellCheck={false}
          placeholder={"https://type-mon.vercel.app/wpm/r?…\nhttps://type-mon.vercel.app/wpm/r?…"}
          className="
            w-full p-3 rounded-xl resize-y
            bg-black/5 dark:bg-white/5
            border border-black/10 dark:border-white/10
            font-mono text-xs leading-relaxed
            text-black/90 dark:text-white/90
            placeholder-black/30 dark:placeholder-white/25
            outline-none focus:border-[#1D9E75]/60
          "
        />
        <span className="text-xs text-black/60 dark:text-white/60">
          Тоглогч бүр үр дүнгийнхээ холбоосыг (нэрээ бичээд) явуулна. Мөр бүрт нэг холбоос. Самбар өөрөө нэг холбоос болно, сервер хэрэггүй.
        </span>
      </label>

      {ranked.length > 0 ? (
        <ol className="flex flex-col gap-1.5" aria-label="Эрэмбэ">
          {ranked.map((r, i) => {
            const tier = tierFor(r.wpm);
            return (
              <li
                key={`${i}-${r.wpm}-${r.name ?? ""}`}
                className="
                  grid grid-cols-[2rem_1fr_auto] items-center gap-3
                  px-3 py-2 rounded-lg
                  bg-black/5 dark:bg-white/5
                  border border-black/5 dark:border-white/5
                "
              >
                <span className="font-mono text-sm text-black/50 dark:text-white/50 tabular-nums">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-black/90 dark:text-white/90">
                    {r.name ?? <span className="text-black/40 dark:text-white/40">Нэргүй</span>}
                  </span>
                  <span className="block text-[11px] text-black/50 dark:text-white/50">
                    {tier.emoji} {tier.name} · {modeLabel(r.mode)} · үнэн зөв {r.accuracy}%
                  </span>
                </span>
                <span className="font-mono text-lg tabular-nums text-[#1D9E75]">{r.wpm}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-black/60 dark:text-white/60">
          Холбоос буулгамагц энд эрэмбэ гарна.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          disabled={ranked.length === 0}
          className="
            inline-flex items-center justify-center min-h-[40px] px-4 rounded-lg
            bg-[#1D9E75] hover:bg-[#178b66] text-white text-sm font-medium
            transition-colors duration-150
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#1D9E75]
          "
        >
          {copied ? "Хууллаа ✓" : "Самбарын холбоос хуулах"}
        </button>
        <Link
          href="/wpm"
          className="
            inline-flex items-center justify-center min-h-[40px] px-3.5 rounded-lg
            bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
            border border-black/10 dark:border-white/10
            text-sm text-black/80 dark:text-white/80
            transition-colors duration-150
          "
        >
          Өөрийн хурдыг шалгах
        </Link>
      </div>
    </div>
  );
}
