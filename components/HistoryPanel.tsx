"use client";

import { useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useClientMounted } from "@/lib/use-client-mounted";

const HISTORY_KEY = "typemon-history";
const HISTORY_MAX = 5;

export type HistoryItem = {
  id: string;
  roman: string;
  cyrillic: string;
  /** Optional AI-polished version. Saved when the user clicks "Хэрэглэх"
   * on the polish panel. Older history items don't have this field. */
  polished?: string;
  createdAt: number;
};

type Props = {
  onLoad: (item: HistoryItem) => void;
};

function readHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is HistoryItem =>
          x &&
          typeof x === "object" &&
          typeof x.id === "string" &&
          typeof x.roman === "string" &&
          typeof x.cyrillic === "string" &&
          typeof x.createdAt === "number"
      )
      .slice(0, HISTORY_MAX);
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

const EMPTY_HISTORY: HistoryItem[] = [];
let cachedRaw: string | null = null;
let cachedItems: HistoryItem[] = EMPTY_HISTORY;

/**
 * Snapshot for useSyncExternalStore. Must return the same array while the
 * stored string is unchanged, otherwise React re-renders forever.
 */
function historySnapshot(): HistoryItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(HISTORY_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = readHistory();
  }
  return cachedItems;
}

function subscribeHistory(callback: () => void) {
  window.addEventListener("typemon-history-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("typemon-history-change", callback);
    window.removeEventListener("storage", callback);
  };
}

export default function HistoryPanel({ onLoad }: Props) {
  const mounted = useClientMounted();
  const items = useSyncExternalStore(subscribeHistory, historySnapshot, () => EMPTY_HISTORY);

  // writeHistory fires "typemon-history-change", which refreshes `items`.
  const handleDelete = useCallback((id: string) => {
    writeHistory(readHistory().filter((x) => x.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    writeHistory([]);
  }, []);

  if (!mounted) {
    return (
      <aside className="flex flex-col gap-3">
        <Header count={0} onClear={() => {}} disabled />
        <div className="text-black/50 dark:text-white/50 text-xs px-1">Loading…</div>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-3">
      <Header count={items.length} onClear={handleClearAll} disabled={items.length === 0} />

      {items.length === 0 ? (
        <div
          className="
            bg-black/[0.03] dark:bg-white/[0.03]
            border border-dashed border-black/10 dark:border-white/10
            rounded-lg px-3 py-6
            text-black/60 dark:text-white/60
            text-xs text-center
          "
        >
          Хадгалсан зүйл байхгүй байна.
          <br />
          <span className="text-black/70 dark:text-white/50">Save</span> дарж хадгална уу.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="
                  group relative
                  bg-black/5 hover:bg-black/10
                  dark:bg-white/5 dark:hover:bg-white/10
                  border border-black/5 hover:border-black/10
                  dark:border-white/5 dark:hover:border-white/10
                  rounded-lg px-3 py-2.5
                  transition-all duration-150
                  cursor-pointer
                "
                onClick={() => onLoad(item)}
              >
                <div className="text-black/50 dark:text-white/50 text-xs font-mono truncate">
                  {item.roman}
                </div>
                <div className="text-black/90 dark:text-white/90 text-sm truncate mt-0.5">
                  {item.cyrillic}
                </div>
                {item.polished && item.polished !== item.cyrillic && (
                  <div
                    className="
                      flex items-center gap-1.5 mt-1
                      text-[#1D9E75] text-xs truncate
                    "
                    title={item.polished}
                  >
                    <span className="text-[10px] opacity-70">✦</span>
                    <span className="truncate">{item.polished}</span>
                  </div>
                )}

                {/* Hover actions */}
                <div
                  className="
                    absolute top-1.5 right-1.5
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-150
                    flex items-center gap-1
                  "
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoad(item);
                    }}
                    className="
                      bg-white/80 dark:bg-black/60
                      backdrop-blur-sm
                      border border-black/10 dark:border-white/10
                      text-black/80 hover:text-black
                      dark:text-white/70 dark:hover:text-white
                      text-[11px] rounded px-1.5 py-0.5
                      transition-colors duration-150
                    "
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    aria-label="Delete"
                    className="
                      bg-white/80 dark:bg-black/60
                      backdrop-blur-sm
                      border border-black/10 dark:border-white/10
                      text-black/50 hover:text-black
                      dark:text-white/40 dark:hover:text-white/90
                      text-[11px] rounded px-1.5 py-0.5
                      transition-colors duration-150
                    "
                  >
                    ✕
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </aside>
  );
}

function Header({
  count,
  onClear,
  disabled,
}: {
  count: number;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[11px] text-black/50 dark:text-white/50 uppercase tracking-widest">
          ХАДГАЛАГДСАН
        </h2>
        <span className="text-[11px] text-black/50 dark:text-white/50 tabular-nums">
          {count}/{HISTORY_MAX}
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        className="
          text-[11px] text-black/50 hover:text-black
          dark:text-white/50 dark:hover:text-white
          transition-colors duration-150
          disabled:opacity-40 disabled:hover:text-black/50
          dark:disabled:hover:text-white/50 disabled:cursor-not-allowed
        "
      >
        Бүгдийг устгах
      </button>
    </div>
  );
}
