import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PlusCheckout from "@/components/PlusCheckout";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";

export const metadata: Metadata = {
  title: "Төлбөр — TypeMon Plus",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <main className="flex-1 w-full min-h-screen bg-[#f5f4ef] text-black/90 dark:bg-[#1a1a1a] dark:text-white/90 transition-colors duration-200">
      <div className="mx-auto w-full max-w-2xl px-5 md:px-8 py-7 md:py-10">
        <header className="mb-7 md:mb-9 flex items-center justify-between">
          <Link href="/plus" className="font-light tracking-tight text-2xl">
            Type<span className="text-[#1D9E75]">Mon</span>
            <span className="ml-2 text-base text-[#1D9E75]">Plus</span>
          </Link>
          <div className="flex items-center gap-3">
            <AccountMenu />
            <ThemeToggle />
          </div>
        </header>

        <section className="bg-[#eeede8] dark:bg-[#242424] border border-black/8 dark:border-white/10 rounded-2xl p-5 md:p-6 transition-colors duration-200">
          <h1 className="text-xl font-light tracking-tight text-black dark:text-white mb-5">Төлбөр</h1>
          <Suspense fallback={<div className="h-52" />}>
            <PlusCheckout />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
