"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/* One control in the header: a sign-in link for guests, an avatar with a
   small menu for members. Hidden entirely when the deployment has no
   Supabase, so nothing about accounts leaks into a guest-only build. */
export default function AccountMenu() {
  const { ready, mode, signedIn, email, name, avatarUrl, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (mode === "unconfigured") return null;
  // Keep the slot's width stable while the session is still being read.
  if (!ready) return <span className="inline-block w-9 h-9" aria-hidden="true" />;

  if (!signedIn) {
    const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
    return (
      <Link
        href={`/login${next}`}
        className="
          inline-flex items-center min-h-[36px] px-3 rounded-lg
          bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
          border border-black/10 dark:border-white/10
          text-sm text-black/80 dark:text-white/80
          transition-colors duration-150
        "
      >
        Нэвтрэх
      </Link>
    );
  }

  const initial = (name || email || "?").charAt(0).toUpperCase();

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Бүртгэл"
        className="
          w-9 h-9 grid place-items-center overflow-hidden rounded-full
          border border-black/10 dark:border-white/10
          bg-[#1D9E75]/15 text-[#1D9E75] text-sm font-medium
          transition-colors duration-150 hover:bg-[#1D9E75]/25
        "
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar host varies by provider
          <img src={avatarUrl} alt="" width={36} height={36} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="
            absolute right-0 top-11 z-40 w-60 p-2
            bg-[#f5f4ef] dark:bg-[#262626]
            border border-black/10 dark:border-white/10
            rounded-xl shadow-lg
          "
        >
          <div className="px-2.5 py-2">
            <div className="text-sm text-black/90 dark:text-white/90 truncate">{name || email}</div>
            {name && email && <div className="text-xs text-black/50 dark:text-white/50 truncate">{email}</div>}
          </div>
          <div className="my-1 h-px bg-black/10 dark:bg-white/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="
              w-full text-left px-2.5 py-2 rounded-lg text-sm
              text-black/70 hover:text-black hover:bg-black/5
              dark:text-white/70 dark:hover:text-white dark:hover:bg-white/5
              transition-colors duration-150
            "
          >
            Гарах
          </button>
        </div>
      )}
    </div>
  );
}
