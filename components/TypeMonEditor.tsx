"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { transliterateSegments } from "@/lib/transliterate";
import type { HistoryItem } from "@/components/HistoryPanel";
import SettingsModal from "@/components/SettingsModal";
import PolishPanel from "@/components/polish/PolishPanel";
import SparkleIcon from "@/components/polish/SparkleIcon";
import { POLISH_MAX_CHARS } from "@/lib/polish-prompt";
import { POLISH_MESSAGES, requestPolish, type PolishStatus } from "@/lib/polish-client";

const HISTORY_KEY = "typemon-history";
const HISTORY_MAX = 5;

type Props = {
  /**
   * Text placed in the input when the component mounts. To load a new
   * value (e.g. a history item) the parent changes the component's `key`.
   */
  initialRoman?: string;
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

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function getServerOnlineSnapshot(): boolean {
  return true;
}

const subscribeNever = () => () => {};

export default function TypeMonEditor({
  initialRoman = "",
  onHistoryChange,
}: Props) {
  const [input, setInput] = useState(initialRoman);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  // Platform never changes, so a store with no updates is enough; the server
  // snapshot keeps SSR markup stable ("Ctrl").
  const mac = useSyncExternalStore(subscribeNever, isMac, () => false);
  const [polish, setPolish] = useState<PolishStatus>({ kind: "idle" });
  const [polishApplied, setPolishApplied] = useState(false);
  const [polishShowChanges, setPolishShowChanges] = useState(false);
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus the input on mount. Loading a history item remounts the editor
  // (the parent changes `key`), so this also runs then.
  useEffect(() => {
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

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
    if (!online) {
      setPolish({ kind: "error", message: POLISH_MESSAGES.offline });
      return;
    }

    const source = cyrillic.trim();
    if (!source) return;
    if (source.length > POLISH_MAX_CHARS) {
      setPolish({ kind: "error", message: POLISH_MESSAGES.tooLong });
      return;
    }

    // Avoid an unnecessary duplicate request when the result is already shown.
    if (polish.kind === "done" && polish.source === source) {
      return;
    }

    setPolish({ kind: "loading" });
    setPolishApplied(false);
    setPolishShowChanges(false);

    setPolish(await requestPolish(source));
  }, [cyrillic, online, polish]);

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
                !online ||
                polish.kind === "loading"
              }
              title={
                !online
                  ? "Интернетгүй үед AI засвар ажиллахгүй"
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
          !online ||
          polish.kind === "loading"
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
      </button>

      {/* Secondary stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-black/50 dark:text-white/50">
        <StatPill label="ҮСЭГ" value={charCount} />
        <StatPill label="ҮГ" value={wordCount} />
        <StatPill label="ҮГ/МИН" value={wpm} />
      </div>

      <PolishPanel
        status={polish}
        showChanges={polishShowChanges}
        onToggleChanges={() => setPolishShowChanges((v) => !v)}
        applied={polishApplied}
        onApply={handlePolishApply}
        onRetry={handlePolishRetry}
      />

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
