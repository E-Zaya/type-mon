"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { diffWords, type DiffToken } from "@/lib/polish-diff";
import type { PolishStatus } from "@/lib/polish-client";
import SparkleIcon from "@/components/polish/SparkleIcon";

type Props = {
  status: PolishStatus;
  /** Whether the per-change explanations are expanded. */
  showChanges: boolean;
  onToggleChanges: () => void;
  /** True once the result has been saved to history. */
  applied: boolean;
  onApply: () => void;
  onRetry: () => void;
};

/**
 * The "AI ЗАСВАР" panel under the editor: skeleton while loading, before/after
 * diff with explanations when done, message with retry on error. Hidden
 * while idle. Copying the result is handled here; saving it is the editor's
 * job because it needs the Latin input too.
 */
export default function PolishPanel({
  status,
  showChanges,
  onToggleChanges,
  applied,
  onApply,
  onRetry,
}: Props) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    if (status.kind !== "done") return;
    try {
      await navigator.clipboard.writeText(status.polished);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* swallow */
    }
  }, [status]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  return (
    <AnimatePresence initial={false}>
      {status.kind !== "idle" && (
        <motion.div
          key={status.kind}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="
            relative
            bg-[#1D9E75]/[0.04] dark:bg-[#1D9E75]/[0.06]
            border border-[#1D9E75]/25 dark:border-[#1D9E75]/30
            rounded-xl p-4
          "
        >
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] text-[#1D9E75] uppercase tracking-widest font-medium inline-flex items-center gap-1.5">
              <SparkleIcon />
              AI ЗАСВАР
            </label>
            {status.kind === "done" && (
              <div className="flex items-center gap-1.5">
                {status.changes.length > 0 && (
                  <button
                    type="button"
                    onClick={onToggleChanges}
                    className="
                      text-[11px] px-2 py-1 rounded-md
                      bg-white/60 dark:bg-black/30
                      border border-black/10 dark:border-white/10
                      text-black/70 hover:text-black
                      dark:text-white/70 dark:hover:text-white
                      transition-colors duration-150
                    "
                  >
                    {showChanges ? "Тайлбарыг хаах" : `Тайлбар (${status.changes.length})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="
                    text-[11px] px-2 py-1 rounded-md
                    bg-white/60 dark:bg-black/30
                    border border-black/10 dark:border-white/10
                    text-black/70 hover:text-black
                    dark:text-white/70 dark:hover:text-white
                    transition-colors duration-150
                  "
                >
                  {copied ? "Хууллаа ✓" : "Хуулах"}
                </button>
                <button
                  type="button"
                  onClick={onApply}
                  disabled={applied}
                  className="
                    text-[11px] px-2 py-1 rounded-md
                    bg-[#1D9E75] hover:bg-[#178b66]
                    border border-[#1D9E75]
                    text-white font-medium
                    transition-colors duration-150
                    disabled:opacity-60 disabled:cursor-not-allowed
                    disabled:hover:bg-[#1D9E75]
                  "
                >
                  {applied ? "Хадгалсан ✓" : "Хэрэглэх"}
                </button>
              </div>
            )}
          </div>

          {status.kind === "loading" && (
            <div className="space-y-2" aria-label="AI магадлан засаж байна">
              <SkeletonLine widthClass="w-11/12" />
              <SkeletonLine widthClass="w-9/12" />
              <SkeletonLine widthClass="w-10/12" />
            </div>
          )}

          {status.kind === "done" && (
            <div className="space-y-3">
              {/* When nothing changed, show a friendly note + the text. */}
              {status.changes.length === 0 ||
              status.polished.trim() === status.source.trim() ? (
                <>
                  <p className="text-[11px] text-black/60 dark:text-white/60">
                    Засах зүйл олдсонгүй. Бичсэн нь зөв байна.
                  </p>
                  <p className="text-base leading-relaxed text-black/90 dark:text-white/90 whitespace-pre-wrap break-words">
                    {status.polished}
                  </p>
                </>
              ) : (
                <>
                  {/* Before/after diff view */}
                  <DiffView source={status.source} polished={status.polished} />

                  {/* Per-change explanations, collapsed by default */}
                  <AnimatePresence initial={false}>
                    {showChanges && (
                      <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="
                          mt-1 pt-3 border-t border-[#1D9E75]/20
                          space-y-1.5 text-xs text-black/70 dark:text-white/70
                          overflow-hidden
                        "
                      >
                        {status.changes.map((c, i) => (
                          <li key={i} className="leading-relaxed">
                            <span className="line-through opacity-60">{c.before}</span>
                            <span className="mx-1.5 text-black/40 dark:text-white/40">→</span>
                            <span className="text-[#1D9E75] font-medium">{c.after}</span>
                            <span className="text-black/50 dark:text-white/50">
                              {" "}— {c.reason}
                            </span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          )}

          {status.kind === "error" && (
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">
                {status.message}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="
                  text-[11px] px-2 py-1 rounded-md
                  bg-white/60 dark:bg-black/30
                  border border-black/10 dark:border-white/10
                  text-black/70 hover:text-black
                  dark:text-white/70 dark:hover:text-white
                  transition-colors duration-150
                  shrink-0
                "
              >
                Дахин оролдох
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DiffView({ source, polished }: { source: string; polished: string }) {
  // Memoize: diff is O(n*m) and we don't want it re-running on every parent
  // render (e.g. when the user types in the textarea while the panel is open).
  const { beforeTokens, afterTokens } = useMemo(
    () => diffWords(source, polished),
    [source, polished]
  );
  return (
    <div className="grid grid-cols-1 gap-2">
      <div>
        <div className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-widest mb-1">
          Анхны
        </div>
        <p className="text-sm leading-relaxed text-black/60 dark:text-white/50 whitespace-pre-wrap break-words">
          <DiffTokens tokens={beforeTokens} mode="before" />
        </p>
      </div>
      <div>
        <div className="text-[10px] text-[#1D9E75] uppercase tracking-widest mb-1">
          Засагдсан
        </div>
        <p className="text-base leading-relaxed text-black/90 dark:text-white/90 whitespace-pre-wrap break-words">
          <DiffTokens tokens={afterTokens} mode="after" />
        </p>
      </div>
    </div>
  );
}

function DiffTokens({
  tokens,
  mode,
}: {
  tokens: DiffToken[];
  mode: "before" | "after";
}) {
  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === "same") return <span key={i}>{t.text}</span>;
        if (mode === "before" && t.kind === "removed") {
          return (
            <span
              key={i}
              className="
                line-through decoration-red-500/60 decoration-2
                bg-red-500/[0.08] dark:bg-red-500/[0.12]
                rounded px-0.5
              "
            >
              {t.text}
            </span>
          );
        }
        if (mode === "after" && t.kind === "added") {
          return (
            <span
              key={i}
              className="
                bg-[#1D9E75]/[0.18] dark:bg-[#1D9E75]/[0.28]
                text-[#1D9E75]
                rounded px-0.5 font-medium
              "
            >
              {t.text}
            </span>
          );
        }
        return null;
      })}
    </>
  );
}

function SkeletonLine({ widthClass }: { widthClass: string }) {
  return (
    <div
      className={`
        h-3 rounded ${widthClass}
        bg-black/10 dark:bg-white/10
        animate-pulse
      `}
    />
  );
}
