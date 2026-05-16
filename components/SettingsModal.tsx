"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Single character / digraph → Cyrillic mapping pairs displayed in the grid.
 * Each entry is [latin, cyrillicLower, cyrillicUpper].
 * Order roughly follows the Cyrillic alphabet for familiarity.
 */
const ALPHABET: Array<[string, string, string]> = [
  ["a", "а", "А"],
  ["b", "б", "Б"],
  ["v", "в", "В"],
  ["g", "г", "Г"],
  ["d", "д", "Д"],
  ["ye", "е", "Е"],
  ["yo", "ё", "Ё"],
  ["j", "ж", "Ж"],
  ["z", "з", "З"],
  ["i", "и", "И"],
  ["y", "й", "Й"],
  ["k", "к", "К"],
  ["l", "л", "Л"],
  ["m", "м", "М"],
  ["n", "н", "Н"],
  ["o", "о", "О"],
  ["q", "ө", "Ө"],
  ["p", "п", "П"],
  ["r", "р", "Р"],
  ["s", "с", "С"],
  ["t", "т", "Т"],
  ["u", "у", "У"],
  ["w", "ү", "Ү"],
  ["f", "ф", "Ф"],
  ["h / x", "х", "Х"],
  ["c / ts", "ц", "Ц"],
  ["ch", "ч", "Ч"],
  ["sh", "ш", "Ш"],
  ["shch", "щ", "Щ"],
  ["''", "ъ", "Ъ"],
  ["'", "ь", "Ь"],
  ["e", "э", "Э"],
  ["yu", "ю", "Ю"],
  ["ya", "я", "Я"],
];

const SPECIAL: Array<[string, string]> = [
  ["aa", "аа"],
  ["ee", "ээ"],
  ["oo", "оо"],
  ["uu", "уу"],
  ["ii", "ий"],
  ["qq", "өө"],
  ["ww", "үү"],
  ["ai", "ай"],
  ["oi", "ой"],
  ["ui", "уй"],
  ["ei", "эй"],
];

export default function SettingsModal({ open, onClose }: Props) {
  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            p-4
          "
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="
              absolute inset-0
              bg-black/30 dark:bg-black/60
              backdrop-blur-sm
            "
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Тохиргоо"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="
              relative z-10
              w-full max-w-2xl max-h-[85vh]
              overflow-y-auto scroll-thin
              bg-[#eeede8] dark:bg-[#242424]
              border border-black/10 dark:border-white/10
              rounded-2xl
              shadow-2xl
            "
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#eeede8]/95 dark:bg-[#242424]/95 backdrop-blur-sm border-b border-black/10 dark:border-white/10">
              <h2 className="text-lg font-light tracking-tight text-black dark:text-white">
                Тохиргоо
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="
                  w-8 h-8 inline-flex items-center justify-center
                  rounded-md
                  text-black/60 hover:text-black hover:bg-black/5
                  dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5
                  transition-colors duration-150
                "
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-6">
              {/* Alphabet section */}
              <section>
                <h3 className="text-[11px] text-black/60 dark:text-white/60 uppercase tracking-widest mb-3">
                  Үсгийн харгалзаа
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ALPHABET.map(([latin, lower, upper]) => (
                    <MappingCell
                      key={`${latin}-${lower}`}
                      latin={latin}
                      cyrillic={`${upper}${lower}`}
                    />
                  ))}
                </div>
              </section>

              {/* Special section */}
              <section>
                <h3 className="text-[11px] text-black/60 dark:text-white/60 uppercase tracking-widest mb-3">
                  Тусгай үсгүүд (давхар авиа)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {SPECIAL.map(([latin, cyr]) => (
                    <MappingCell key={latin} latin={latin} cyrillic={cyr} />
                  ))}
                </div>
              </section>

              {/* Latin escape syntax */}
              <section
                className="
                  border-t border-black/10 dark:border-white/10 pt-5
                "
              >
                <h3 className="text-[11px] text-black/60 dark:text-white/60 uppercase tracking-widest mb-3">
                  Latin үсгээр бичих
                </h3>
                <p className="text-sm text-black/80 dark:text-white/80 leading-relaxed">
                  Хэрэв англи үг шууд оруулах бол{" "}
                  <code className="font-mono text-[#1D9E75]">*</code> од-оор
                  хүрээлээрэй. Жишээ нь:
                </p>
                <div
                  className="
                    mt-3 p-3 rounded-lg
                    bg-black/5 dark:bg-white/5
                    border border-black/10 dark:border-white/10
                    text-sm
                  "
                >
                  <div className="font-mono text-black/80 dark:text-white/80">
                    Minii mergejil{" "}
                    <span className="text-[#1D9E75]">*Programmer*</span>
                  </div>
                  <div className="text-black/50 dark:text-white/50 my-1 text-xs">
                    ↓
                  </div>
                  <div className="text-black/90 dark:text-white/90">
                    Миний мэргэжил{" "}
                    <span className="text-[#1D9E75]">Programmer</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-black/60 dark:text-white/60 leading-relaxed">
                  Од хооронд бичсэн үг кирилл болгохгүй, шууд латинаар үлдэнэ.
                </p>
              </section>

              {/* Keyboard shortcuts */}
              <section
                className="
                  border-t border-black/10 dark:border-white/10 pt-5
                "
              >
                <h3 className="text-[11px] text-black/60 dark:text-white/60 uppercase tracking-widest mb-3">
                  Товчлуурын товчлол
                </h3>
                <div className="flex flex-col gap-1.5">
                  <ShortcutRow keys={["Ctrl/⌘", "K"]} desc="Clear" />
                  <ShortcutRow keys={["Ctrl/⌘", "S"]} desc="Save" />
                  <ShortcutRow keys={["Ctrl/⌘", "Shift", "C"]} desc="Copy" />
                  <ShortcutRow keys={["Ctrl/⌘", ","]} desc="Open settings" />
                  <ShortcutRow keys={["Esc"]} desc="Close settings" />
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MappingCell({ latin, cyrillic }: { latin: string; cyrillic: string }) {
  return (
    <div
      className="
        flex items-center justify-between gap-2
        px-2.5 py-1.5
        bg-black/5 dark:bg-white/5
        border border-black/5 dark:border-white/5
        rounded-md
      "
    >
      <span className="font-cyrillic text-sm text-black/90 dark:text-white/90">
        {cyrillic}
      </span>
      <span className="font-mono text-xs text-black/60 dark:text-white/60">
        {latin}
      </span>
    </div>
  );
}

function ShortcutRow({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="
              bg-black/5 dark:bg-white/5
              border border-black/10 dark:border-white/10
              rounded px-1.5 py-0.5
              font-mono text-[11px]
              text-black/70 dark:text-white/70
            "
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-sm text-black/70 dark:text-white/70">{desc}</span>
    </div>
  );
}
