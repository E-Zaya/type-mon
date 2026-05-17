"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { transliterateSegments } from "@/lib/transliterate";
import type { HistoryItem } from "@/components/HistoryPanel";
import SettingsModal from "@/components/SettingsModal";
import {
  POLISH_DAILY_LIMIT,
  POLISH_MAX_CHARS,
  type PolishChange,
} from "@/lib/polish-prompt";
import {
  getRemainingPolishes,
  markQuotaExhausted,
  recordPolishUsed,
  syncRemainingFromServer,
} from "@/lib/polish-quota";
import { diffWords, type DiffToken } from "@/lib/polish-diff";

const HISTORY_KEY = "typemon-history";
const HISTORY_MAX = 5;

type PolishStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "done";
      /** The cyrillic text that was sent — used to detect "same input, skip API". */
      source: string;
      polished: string;
      changes: PolishChange[];
    }
  | { kind: "error"; message: string };

type Props = {
  /** Optional ref-like setter so HistoryPanel (or parent) can push values into the editor. */
  initialRoman?: string;
  /** Bumped by parent to request a re-load of `initialRoman` even if value is identical. */
  loadToken?: number;
  /** Called whenever history changes so the parent (HistoryPanel) can re-render. */
  onHistoryChange?: (items: HistoryItem[]) => void;
};

function readHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is HistoryItem =>
        x &&
        typeof x === "object" &&
        typeof x.id === "string" &&
        typeof x.roman === "string" &&
        typeof x.cyrillic === "string" &&
        typeof x.createdAt === "number"
    );
  } catch {
    return [];
  }
}

function writeHistory(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("typemon-history-change"));
  } catch {
    /* swallow */
  }
}

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
}

export default function TypeMonEditor({
  initialRoman = "",
  loadToken = 0,
  onHistoryChange,
}: Props) {
  const [input, setInput] = useState(initialRoman);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [mac, setMac] = useState(false);
  const [polish, setPolish] = useState<PolishStatus>({ kind: "idle" });
  const [polishCopied, setPolishCopied] = useState(false);
  const [polishApplied, setPolishApplied] = useState(false);
  const [polishShowChanges, setPolishShowChanges] = useState(false);
  // null means "not yet hydrated from localStorage" — we render a neutral
  // placeholder during SSR to avoid hydration mismatches.
  const [polishRemaining, setPolishRemaining] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const polishCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMac(isMac());
    setPolishRemaining(getRemainingPolishes());
  }, []);

  // Sync from parent when loadToken bumps
  useEffect(() => {
    setInput(initialRoman);
    setStartedAt(null);
    setElapsedSec(0);
    setPolish({ kind: "idle" });
    setPolishApplied(false);
    setPolishShowChanges(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadToken]);

  // Tick timer while typing (for live wpm)
  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => {
      setElapsedSec((Date.now() - startedAt) / 1000);
    }, 500);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const segments = useMemo(() => transliterateSegments(input), [input]);
  const cyrillic = useMemo(() => segments.map((s) => s.text).join(""), [segments]);
  // Stable key for the output's AnimatePresence — re-mount only when the
  // textual output changes, otherwise highlights flicker on every keystroke.
  const segmentsKey = cyrillic;

  const charCount = input.length;
  const wordCount = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [input]);
  const wpm = useMemo(() => {
    if (!startedAt || elapsedSec < 1 || wordCount === 0) return 0;
    return Math.round(wordCount / (elapsedSec / 60));
  }, [startedAt, elapsedSec, wordCount]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setInput(next);
      // Any edit invalidates the previous polished result.
      setPolish((p) => (p.kind === "idle" ? p : { kind: "idle" }));
      setPolishApplied(false);
      setPolishShowChanges(false);
      if (next.length > 0 && startedAt === null) {
        setStartedAt(Date.now());
      } else if (next.length === 0) {
        setStartedAt(null);
        setElapsedSec(0);
      }
    },
    [startedAt]
  );

  const handleCopy = useCallback(async () => {
    if (!cyrillic) return;
    try {
      await navigator.clipboard.writeText(cyrillic);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* swallow */
    }
  }, [cyrillic]);

  const handleClear = useCallback(() => {
    setInput("");
    setStartedAt(null);
    setElapsedSec(0);
    setPolish({ kind: "idle" });
    setPolishApplied(false);
    setPolishShowChanges(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const handlePolish = useCallback(async () => {
    const source = cyrillic.trim();
    if (!source) return;
    if (source.length > POLISH_MAX_CHARS) {
      setPolish({
        kind: "error",
        message: `Уртаа хэтэрсэн байна (${POLISH_MAX_CHARS} тэмдэгтээс багатай байх ёстой).`,
      });
      return;
    }

    // Cache: if we already polished this exact source, don't re-spend quota
    // or even hit the network. The result is already on screen.
    if (polish.kind === "done" && polish.source === source) {
      return;
    }

    if (polishRemaining !== null && polishRemaining <= 0) {
      setPolish({
        kind: "error",
        message: "Өнөөдрийн хязгаар дууссан. Маргааш дахин оролдоно уу.",
      });
      return;
    }

    setPolish({ kind: "loading" });
    setPolishApplied(false);
    setPolishShowChanges(false);

    try {
      const res = await fetch("/api/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source }),
      });

      const data = (await res.json().catch(() => null)) as
        | {
            ok: boolean;
            polished?: string;
            changes?: PolishChange[];
            remaining?: number | null;
            error?: string;
          }
        | null;

      if (res.status === 429) {
        markQuotaExhausted();
        setPolishRemaining(0);
        setPolish({
          kind: "error",
          message: "Өнөөдрийн хязгаар дууссан. Маргааш дахин оролдоно уу.",
        });
        return;
      }

      if (!res.ok || !data?.ok || !data.polished) {
        const code = data?.error ?? "UPSTREAM_ERROR";
        const message =
          code === "TOO_LONG"
            ? `Уртаа хэтэрсэн байна (${POLISH_MAX_CHARS} тэмдэгтээс багатай байх ёстой).`
            : code === "NOT_CONFIGURED"
            ? "Үйлчилгээ тохируулагдаагүй байна."
            : "Алдаа гарлаа. Дахин оролдоно уу.";
        setPolish({ kind: "error", message });
        return;
      }

      // Prefer the server's authoritative remaining count; fall back to
      // local increment when the server didn't include one (dev mode).
      if (typeof data.remaining === "number") {
        syncRemainingFromServer(data.remaining);
        setPolishRemaining(getRemainingPolishes());
      } else {
        setPolishRemaining(recordPolishUsed());
      }

      setPolish({
        kind: "done",
        source,
        polished: data.polished,
        changes: data.changes ?? [],
      });
    } catch {
      setPolish({
        kind: "error",
        message: "Сүлжээний алдаа гарлаа. Дахин оролдоно уу.",
      });
    }
  }, [cyrillic, polish, polishRemaining]);

  const handlePolishedCopy = useCallback(async () => {
    if (polish.kind !== "done") return;
    try {
      await navigator.clipboard.writeText(polish.polished);
      setPolishCopied(true);
      if (polishCopyTimeoutRef.current) clearTimeout(polishCopyTimeoutRef.current);
      polishCopyTimeoutRef.current = setTimeout(() => setPolishCopied(false), 2000);
    } catch {
      /* swallow */
    }
  }, [polish]);

  /** "Хэрэглэх" — save the polished result to history. */
  const handlePolishApply = useCallback(() => {
    if (polish.kind !== "done") return;
    const roman = input.trim();
    const polished = polish.polished.trim();
    if (!roman || !polished) return;
    const items = readHistory();
    const item: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      roman,
      cyrillic: polished,
      polished,
      createdAt: Date.now(),
    };
    const next = [item, ...items.filter((x) => x.roman !== roman)].slice(0, HISTORY_MAX);
    writeHistory(next);
    onHistoryChange?.(next);
    setPolishApplied(true);
  }, [polish, input, onHistoryChange]);

  /** Manual retry — clear error state and re-fire handlePolish. */
  const handlePolishRetry = useCallback(() => {
    setPolish({ kind: "idle" });
    // Defer one frame so the panel collapse animation fires before the
    // loading state reappears — looks intentional rather than glitchy.
    requestAnimationFrame(() => {
      handlePolish();
    });
  }, [handlePolish]);

  const handleSave = useCallback(() => {
    const roman = input.trim();
    const cyr = cyrillic.trim();
    if (!roman || !cyr) return;
    const items = readHistory();
    const item: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      roman,
      cyrillic: cyr,
      createdAt: Date.now(),
    };
    const next = [item, ...items.filter((x) => x.roman !== roman)].slice(0, HISTORY_MAX);
    writeHistory(next);
    onHistoryChange?.(next);
    setSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
  }, [input, cyrillic, onHistoryChange]);

  // Keyboard shortcuts (global)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      // Cmd/Ctrl + Shift + C → copy cyrillic
      if (key === "c" && e.shiftKey) {
        e.preventDefault();
        handleCopy();
        return;
      }
      // Cmd/Ctrl + K → clear
      if (key === "k" && !e.shiftKey) {
        e.preventDefault();
        handleClear();
        return;
      }
      // Cmd/Ctrl + S → save
      if (key === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
        return;
      }
      // Cmd/Ctrl + , → open settings
      if (key === ",") {
        e.preventDefault();
        setSettingsOpen((v) => !v);
        return;
      }
      // Cmd/Ctrl + Shift + P → AI polish
      if (key === "p" && e.shiftKey) {
        e.preventDefault();
        handlePolish();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCopy, handleClear, handleSave, handlePolish]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (polishCopyTimeoutRef.current) clearTimeout(polishCopyTimeoutRef.current);
    };
  }, []);

  const hasContent = input.length > 0;
  const modKey = mac ? "⌘" : "Ctrl";

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Editor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Romanized input */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-black/50 dark:text-white/50 uppercase tracking-widest px-1">
            ЛАТИН
          </label>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            spellCheck={false}
            placeholder="Sain baina uu"
            className="
              w-full min-h-[280px] md:min-h-[360px] resize-none p-4
              bg-black/5 dark:bg-white/5
              border border-black/10 dark:border-white/10
              rounded-xl
              text-black/90 dark:text-white/90
              placeholder-black/30 dark:placeholder-white/20
              font-mono text-base leading-relaxed
              outline-none transition-all duration-150
              focus:border-[#1D9E75]/60 focus:bg-black/[0.07] dark:focus:bg-white/[0.07]
              backdrop-blur-sm
            "
          />
        </div>

        {/* Cyrillic output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-[11px] text-black/50 dark:text-white/50 uppercase tracking-widest">
              КИРИЛЛ
            </label>
            {/* Desktop polish button — prominent, lives at the top of the
                output column so the eye finds it immediately after reading
                the transliterated text. */}
            <button
              type="button"
              onClick={handlePolish}
              disabled={
                !cyrillic ||
                polish.kind === "loading" ||
                (polishRemaining !== null && polishRemaining <= 0)
              }
              title={
                polishRemaining !== null
                  ? `AI-аар засах · Өдөрт ${polishRemaining}/${POLISH_DAILY_LIMIT} үлдсэн (${modKey}+⇧+P)`
                  : `AI-аар засах (${modKey}+⇧+P)`
              }
              className="
                hidden md:inline-flex items-center gap-1.5
                bg-[#1D9E75] hover:bg-[#178b66]
                border border-[#1D9E75]
                rounded-md text-xs px-2.5 py-1
                text-white font-medium
                shadow-sm
                transition-all duration-150
                disabled:opacity-40 disabled:cursor-not-allowed
                disabled:hover:bg-[#1D9E75]
              "
            >
              <SparkleIcon spinning={polish.kind === "loading"} />
              <span>{polish.kind === "loading" ? "Засаж байна…" : "AI-аар засах"}</span>
              {polishRemaining !== null && (
                <span className="text-[10px] tabular-nums opacity-80">
                  {polishRemaining}/{POLISH_DAILY_LIMIT}
                </span>
              )}
            </button>
          </div>
          <div className="group relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={segmentsKey}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="
                  w-full min-h-[280px] md:min-h-[360px] p-4
                  bg-black/5 dark:bg-white/5
                  border border-black/10 dark:border-white/10
                  rounded-xl
                  text-black/90 dark:text-white/90
                  text-base leading-relaxed
                  whitespace-pre-wrap break-words
                  backdrop-blur-sm
                  overflow-auto
                "
                aria-readonly="true"
              >
                {cyrillic ? (
                  segments.map((s, idx) =>
                    s.literal ? (
                      <span key={idx} className="text-[#1D9E75]">
                        {s.text}
                      </span>
                    ) : (
                      <span key={idx}>{s.text}</span>
                    )
                  )
                ) : (
                  <span className="text-black/40 dark:text-white/40">Сайн байна уу</span>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Polishing overlay — dims the Cyrillic text while we wait so
                the user clearly sees something is happening. */}
            {polish.kind === "loading" && (
              <div
                className="
                  absolute inset-0 rounded-xl
                  bg-black/[0.04] dark:bg-white/[0.04]
                  backdrop-blur-[1px]
                  pointer-events-none
                "
                aria-hidden
              />
            )}

            {/* Hover Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!cyrillic}
              className="
                hidden md:block
                absolute top-3 right-3
                opacity-0 group-hover:opacity-100 focus:opacity-100
                bg-white/80 dark:bg-black/60
                backdrop-blur-sm
                border border-black/10 dark:border-white/10
                text-black/80 hover:text-black
                dark:text-white/70 dark:hover:text-white
                text-xs rounded-md px-2 py-1
                transition-all duration-150
                disabled:opacity-0 disabled:cursor-not-allowed
              "
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Settings (gear) — placed before Clear/Save */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Тохиргоо"
          title="Тохиргоо (Settings)"
          className="
            w-9 h-9 inline-flex items-center justify-center
            bg-black/5 hover:bg-black/10
            dark:bg-white/5 dark:hover:bg-white/10
            border border-black/10 dark:border-white/10
            rounded-lg
            text-black/70 hover:text-black
            dark:text-white/70 dark:hover:text-white
            transition-all duration-150
          "
        >
          <GearIcon />
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={!hasContent}
          className="
            bg-black/5 hover:bg-black/10
            dark:bg-white/5 dark:hover:bg-white/10
            border border-black/10 dark:border-white/10
            rounded-lg text-sm px-3 py-1.5
            text-black/80 hover:text-black
            dark:text-white/80 dark:hover:text-white
            transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            disabled:hover:bg-black/5 dark:disabled:hover:bg-white/5
          "
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasContent}
          className="
            bg-black/5 hover:bg-black/10
            dark:bg-white/5 dark:hover:bg-white/10
            border border-black/10 dark:border-white/10
            rounded-lg text-sm px-3 py-1.5
            text-black/80 hover:text-black
            dark:text-white/80 dark:hover:text-white
            transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            disabled:hover:bg-black/5 dark:disabled:hover:bg-white/5
          "
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!cyrillic}
          className="
            md:hidden flex-1 min-w-[120px]
            bg-[#1D9E75] hover:bg-[#178b66]
            border border-[#1D9E75]/70
            rounded-lg text-sm px-4 py-2
            text-white
            transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            disabled:hover:bg-[#1D9E75]
          "
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>

        {/* Shortcut legend (right-aligned on wider screens) */}
        <div className="hidden sm:flex items-center gap-3 ml-auto text-black/50 dark:text-white/50 text-[11px]">
          <ShortcutChip keys={[modKey, "K"]} desc="Clear" />
          <ShortcutChip keys={[modKey, "S"]} desc="Save" />
          <ShortcutChip keys={[modKey, "Shift", "C"]} desc="Copy" />
          <ShortcutChip keys={[modKey, "Shift", "P"]} desc="Polish" />
        </div>
      </div>

      {/* Mobile-only polish button — full width on its own row so it doesn't
          fight the green Copy button for attention. */}
      <button
        type="button"
        onClick={handlePolish}
        disabled={
          !cyrillic ||
          polish.kind === "loading" ||
          (polishRemaining !== null && polishRemaining <= 0)
        }
        className="
          md:hidden w-full inline-flex items-center justify-center gap-2
          min-h-[44px]
          bg-transparent hover:bg-[#1D9E75]/10
          border border-[#1D9E75]/60
          rounded-lg text-sm px-4 py-2
          text-[#1D9E75] font-medium
          transition-all duration-150
          disabled:opacity-40 disabled:cursor-not-allowed
          disabled:hover:bg-transparent
        "
      >
        <SparkleIcon spinning={polish.kind === "loading"} />
        <span>{polish.kind === "loading" ? "Засаж байна…" : "AI-аар засах"}</span>
        {polishRemaining !== null && (
          <span className="text-[10px] tabular-nums opacity-70">
            ({polishRemaining}/{POLISH_DAILY_LIMIT})
          </span>
        )}
      </button>
      {/* First-time hint, only shown on mobile under the button.
          Hidden on desktop where the tooltip on the corner button serves the same purpose. */}
      {polishRemaining !== null && polish.kind === "idle" && (
        <p className="md:hidden text-[11px] text-black/50 dark:text-white/50 text-center -mt-2">
          Өдөрт {POLISH_DAILY_LIMIT} удаа үнэгүй ашиглах боломжтой.
        </p>
      )}

      {/* Secondary stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-black/50 dark:text-white/50">
        <StatPill label="ҮСЭГ" value={charCount} />
        <StatPill label="ҮГ" value={wordCount} />
        <StatPill label="ҮГ/МИН" value={wpm} />
      </div>

      {/* Polish result panel — only shown when there's something to show */}
      <AnimatePresence initial={false}>
        {polish.kind !== "idle" && (
          <motion.div
            key={polish.kind}
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
              {polish.kind === "done" && (
                <div className="flex items-center gap-1.5">
                  {polish.changes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPolishShowChanges((v) => !v)}
                      className="
                        text-[11px] px-2 py-1 rounded-md
                        bg-white/60 dark:bg-black/30
                        border border-black/10 dark:border-white/10
                        text-black/70 hover:text-black
                        dark:text-white/70 dark:hover:text-white
                        transition-colors duration-150
                      "
                    >
                      {polishShowChanges ? "Тайлбарыг хаах" : `Тайлбар (${polish.changes.length})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePolishedCopy}
                    className="
                      text-[11px] px-2 py-1 rounded-md
                      bg-white/60 dark:bg-black/30
                      border border-black/10 dark:border-white/10
                      text-black/70 hover:text-black
                      dark:text-white/70 dark:hover:text-white
                      transition-colors duration-150
                    "
                  >
                    {polishCopied ? "Хууллаа ✓" : "Хуулах"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePolishApply}
                    disabled={polishApplied}
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
                    {polishApplied ? "Хадгалсан ✓" : "Хэрэглэх"}
                  </button>
                </div>
              )}
            </div>

            {polish.kind === "loading" && (
              <div className="space-y-2" aria-label="AI магадлан засаж байна">
                <SkeletonLine widthClass="w-11/12" />
                <SkeletonLine widthClass="w-9/12" />
                <SkeletonLine widthClass="w-10/12" />
              </div>
            )}

            {polish.kind === "done" && (
              <div className="space-y-3">
                {/* When nothing changed, show a friendly note + the text. */}
                {polish.changes.length === 0 ||
                polish.polished.trim() === polish.source.trim() ? (
                  <>
                    <p className="text-[11px] text-black/60 dark:text-white/60">
                      Засах зүйл олдсонгүй. Бичсэн нь зөв байна.
                    </p>
                    <p className="text-base leading-relaxed text-black/90 dark:text-white/90 whitespace-pre-wrap break-words">
                      {polish.polished}
                    </p>
                  </>
                ) : (
                  <>
                    {/* Before/after diff view */}
                    <DiffView source={polish.source} polished={polish.polished} />

                    {/* Per-change explanations, collapsed by default */}
                    <AnimatePresence initial={false}>
                      {polishShowChanges && (
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
                          {polish.changes.map((c, i) => (
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

            {polish.kind === "error" && (
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-red-600 dark:text-red-400 flex-1">
                  {polish.message}
                </p>
                <button
                  type="button"
                  onClick={handlePolishRetry}
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

      {/* Settings modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 uppercase tracking-widest">
      <span>{label}</span>
      <span className="font-mono text-black/70 dark:text-white/70 tabular-nums">{value}</span>
    </span>
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

function SparkleIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={spinning ? "animate-spin" : undefined}
    >
      <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ShortcutChip({
  keys,
  desc,
}: {
  keys: string[];
  desc: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="
              bg-black/5 dark:bg-white/5
              border border-black/10 dark:border-white/10
              rounded px-1.5 py-0.5
              font-mono text-[10px]
              text-black/70 dark:text-white/60
            "
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-black/60 dark:text-white/60">{desc}</span>
    </span>
  );
}
