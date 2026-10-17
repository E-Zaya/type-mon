import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ClassBoard from "@/components/wpm/ClassBoard";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "TypeMon Хурд · Ангийн самбар",
  description: "Найзууд, анги, сургуулиараа хурдаа харьцуул. Холбоосоо буулгахад эрэмбэ гарна.",
  robots: { index: false, follow: true },
};

export default function BoardPage() {
  return (
    <main className="flex-1 w-full min-h-screen bg-[#f5f4ef] text-black/90 dark:bg-[#1a1a1a] dark:text-white/90 transition-colors duration-200">
      <div className="mx-auto w-full max-w-3xl px-5 md:px-8 py-7 md:py-10">
        <header className="mb-7 md:mb-9">
          <div className="flex items-center justify-between">
            <Link href="/wpm" className="font-light tracking-tight text-2xl">
              Type<span className="text-[#1D9E75]">Mon</span>
              <span className="ml-2 text-base text-black/50 dark:text-white/50">Хурд</span>
            </Link>
            <ThemeToggle />
          </div>
          <div className="mt-4 md:mt-5 max-w-xl">
            <h1 className="text-2xl md:text-3xl font-light tracking-tight text-black dark:text-white leading-tight">
              Ангийн самбар
            </h1>
            <p className="mt-3 text-sm text-black/70 dark:text-white/70">
              Анги, сургууль, найзуудынхаа эрэмбэ. Бүртгэл хэрэггүй.
            </p>
          </div>
        </header>

        <section
          className="
            bg-[#eeede8] dark:bg-[#242424]
            border border-black/8 dark:border-white/10
            rounded-2xl p-4 md:p-6
            transition-colors duration-200
          "
        >
          <Suspense fallback={<div className="h-40" />}>
            <ClassBoard />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
