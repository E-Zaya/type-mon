"use client";

import { useEffect } from "react";

const CORE_CACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon",
  "/apple-icon",
  "/icon-192",
  "/icon-512",
];

function collectCurrentPageAssets(): string[] {
  const urls = new Set(CORE_CACHE_URLS);

  document
    .querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
      'script[src], link[href][rel="stylesheet"], link[href][rel="modulepreload"], link[href][rel="preload"], link[href][rel="icon"], link[href][rel="apple-touch-icon"], link[href][rel="manifest"]'
    )
    .forEach((element) => {
      const rawUrl =
        element instanceof HTMLScriptElement
          ? element.src
          : element.href;
      if (!rawUrl) return;

      try {
        const url = new URL(rawUrl, window.location.href);
        if (url.origin === window.location.origin) {
          urls.add(`${url.pathname}${url.search}`);
        }
      } catch {
        /* ignore malformed URLs */
      }
    });

  return [...urls];
}

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        const worker = registration.active ?? navigator.serviceWorker.controller;
        worker?.postMessage({
          type: "CACHE_URLS",
          urls: collectCurrentPageAssets(),
        });

        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      } catch {
        /* PWA support is progressive enhancement. */
      }
    }

    registerServiceWorker();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
