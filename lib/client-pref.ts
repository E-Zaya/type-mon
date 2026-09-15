"use client";

import { useCallback, useSyncExternalStore } from "react";

/* A localStorage value read through an external store, so the first render
   matches on server and client and every mounted reader updates together
   when one of them writes. */

const EVENT = "typemon-pref-change";

export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the value lives for this page only */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function usePref(key: string, fallback: string): [string, (value: string | null) => void] {
  const value = useSyncExternalStore(subscribe, () => readPref(key) ?? fallback, () => fallback);
  const set = useCallback((next: string | null) => writePref(key, next), [key]);
  return [value, set];
}
