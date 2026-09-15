import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import LoginPanel from "@/components/LoginPanel";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Нэвтрэх — TypeMon",
  description: "Google эсвэл имэйлийн холбоосоор нэвтэрч, AI засварыг илүү олон удаа ашигла.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex-1 w-full min-h-screen bg-[#f5f4ef] text-black/90 dark:bg-[#1a1a1a] dark:text-white/90 transition-colors duration-200">
      <div className="mx-auto w-full max-w-md px-5 md:px-8 py-7 md:py-10">
        <header className="mb-7 md:mb-9 flex items-center justify-between">
          <Link href="/" className="font-light tracking-tight text-2xl">
            Type<span className="text-[#1D9E75]">Mon</span>
          </Link>
          <ThemeToggle />
        </header>

        <section
          className="
            bg-[#eeede8] dark:bg-[#242424]
            border border-black/8 dark:border-white/10
            rounded-2xl p-5 md:p-6
            transition-colors duration-200
          "
        >
          <h1 className="text-2xl font-light tracking-tight text-black dark:text-white">Нэвтрэх</h1>
          <p className="mt-2 mb-5 text-sm text-black/60 dark:text-white/60">
            Бүртгэл нээх, нэвтрэх хоёр адилхан — нэг товч.
          </p>
          <Suspense fallback={<div className="h-48" />}>
            <LoginPanel />
          </Suspense>
        </section>

        <footer className="mt-8 text-xs text-black/50 dark:text-white/50 text-center">
          <Link href="/" className="hover:text-[#1D9E75] transition-colors duration-150">
            Нэвтрэхгүйгээр үргэлжлүүлэх →
          </Link>
        </footer>
      </div>
    </main>
  );
}
