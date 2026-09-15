"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import TypingTest from "@/components/wpm/TypingTest";
import ResultCard from "@/components/wpm/ResultCard";
import { MODES, type WpmMode } from "@/lib/wpm-words";
import { isMode, type WpmResult } from "@/lib/wpm-rank";

const BEST_KEY = "typemon-wpm-best";
const BEST_EVENT = "typemon-wpm-best-change";

type Best = Partial<Record<WpmMode, number>>;

function parseBest(raw: string): Best {
  try {
    const parsed = raw ? (JSON.parse(raw) as Best) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/* Personal bests live in localStorage; reading them through an external
   store keeps the first render consistent between server and client. */
function subscribeBest(callback: () => void) {
  window.addEventListener(BEST_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(BEST_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function readBestRaw(): string {
  try {
    return window.localStorage.getItem(BEST_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeBest(next: Best) {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(BEST_EVENT));
}

const noSubscribe = () => () => {};

export default function WpmGame() {
  const params = useSearchParams();
  const initialMode = params?.get("mode");
  const targetParam = Number(params?.get("target"));
  const target = Number.isFinite(targetParam) && targetParam > 0 && targetParam < 400 ? Math.round(targetParam) : undefined;

  const [mode, setMode] = useState<WpmMode>(isMode(initialMode) ? initialMode : "cy");
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<WpmResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const bestRaw = useSyncExternalStore(subscribeBest, readBestRaw, () => "");
  const best = useMemo(() => parseBest(bestRaw), [bestRaw]);
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => undefined);

  const onFinish = useCallback((r: WpmResult) => {
    setResult(r);
    const current = parseBest(readBestRaw());
    const previous = current[r.mode] ?? 0;
    if (r.wpm > previous) {
      writeBest({ ...current, [r.mode]: r.wpm });
      setIsNewBest(previous > 0);
    } else {
      setIsNewBest(false);
    }
  }, []);

  const retry = useCallback(() => {
    setResult(null);
    setIsNewBest(false);
    setRun((n) => n + 1);
  }, []);

  const choose = useCallback((next: WpmMode) => {
    setMode(next);
    setResult(null);
    setIsNewBest(false);
    setRun((n) => n + 1);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Mode picker */}
      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => choose(m.id)}
            aria-pressed={mode === m.id}
            title={m.hint}
            className={`
              min-h-[36px] px-3.5 rounded-lg text-sm
              border transition-colors duration-150
              ${mode === m.id
                ? "bg-[#1D9E75] border-[#1D9E75] text-white"
                : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/75 dark:text-white/75 hover:bg-black/10 dark:hover:bg-white/10"}
            `}
          >
            {m.label}
          </button>
        ))}
        {best[mode] ? (
          <span className="ml-auto text-[11px] uppercase tracking-widest text-black/50 dark:text-white/50">
            Дээд амжилт <span className="font-mono text-[#1D9E75]">{best[mode]}</span>
          </span>
        ) : null}
      </div>

      {result ? (
        <>
          {isNewBest && (
            <div className="text-center text-sm text-[#1D9E75]">🎉 Шинэ дээд амжилт!</div>
          )}
          <ResultCard result={result} origin={origin} onRetry={retry} />
        </>
      ) : (
        <TypingTest key={`${mode}-${run}`} mode={mode} target={target} onFinish={onFinish} />
      )}
    </div>
  );
}
