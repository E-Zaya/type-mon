"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import TypeMonEditor from "@/components/TypeMonEditor";
import HistoryPanel, { type HistoryItem } from "@/components/HistoryPanel";
import ThemeToggle from "@/components/ThemeToggle";

const URL_TEXT_MAX = 2000;

function HomeInner() {
  const searchParams = useSearchParams();
  const [initialRoman, setInitialRoman] = useState("");
  const [loadToken, setLoadToken] = useState(0);

  // Read ?text=... once on mount
  useEffect(() => {
    const fromUrl = searchParams?.get("text");
    if (fromUrl) {
      const safe = fromUrl.slice(0, URL_TEXT_MAX);
      setInitialRoman(safe);
      setLoadToken((t) => t + 1);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("text");
        const cleaned = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "");
        window.history.replaceState({}, "", cleaned);
      } catch {
        /* swallow */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoad = useCallback((item: HistoryItem) => {
    setInitialRoman(item.roman);
    setLoadToken((t) => t + 1);
  }, []);

  return (
    <main
      className="
        flex-1 w-full min-h-screen
        bg-[#f5f4ef] text-black/90
        dark:bg-[#1a1a1a] dark:text-white/90
        transition-colors duration-200
      "
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8 py-7 md:py-10">
        {/* Logo / header */}
        <header className="mb-7 md:mb-9">
          <div className="flex items-center justify-between">
            <h1 className="font-light tracking-tight text-2xl">
              Type<span className="text-[#1D9E75]">Mon</span>
            </h1>
            <div className="flex items-center gap-3">
              <p className="hidden sm:block text-xs text-black/60 dark:text-white/60">
                Латин үсгээр бичээд Кирилл болго
              </p>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-4 md:mt-5 max-w-xl">
            <h2 className="text-2xl md:text-3xl font-light tracking-tight text-black dark:text-white leading-tight">
              Латинаар бичиж, Кириллээр илгээ.
            </h2>
            <p className="mt-3 text-sm text-black/70 dark:text-white/70">
              <span className="font-mono text-black/90 dark:text-white/90">Sain baina uu</span>
              <span className="text-black/50 dark:text-white/50"> → </span>
              <span className="text-[#1D9E75]">Сайн байна уу</span>
            </p>
          </div>
        </header>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-9">
          <section
            className="
              bg-[#eeede8] dark:bg-[#242424]
              border border-black/8 dark:border-white/10
              rounded-2xl
              p-4 md:p-6
              backdrop-blur-sm
              transition-colors duration-200
            "
          >
            <TypeMonEditor initialRoman={initialRoman} loadToken={loadToken} />
          </section>

          <section
            className="
              bg-[#eae9e2] dark:bg-[#262626]
              border border-black/8 dark:border-white/10
              rounded-2xl
              p-5
              backdrop-blur-sm
              h-fit
              transition-colors duration-200
            "
          >
            <HistoryPanel onLoad={handleLoad} />
          </section>
        </div>

        <footer className="mt-9 md:mt-12 text-xs text-black/50 dark:text-white/50 text-center">
          Латинаар бичээд дассан Монголчуудад зориулав ·{" "}
          <span className="text-black/70 dark:text-white/70">TypeMon</span>
        </footer>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 w-full min-h-screen bg-[#f5f4ef] dark:bg-[#1a1a1a]" />
      }
    >
      <HomeInner />
    </Suspense>
  );
}
