"use client";

import { useCallback, useMemo } from "react";
import { usePref } from "@/lib/client-pref";

/*
 * Personal transliteration rules (Plus). Someone who learned to write ө as
 * "o'" or ү as "y" keeps that habit instead of learning TypeMon's letters.
 * Rules are a few Latin characters → a few Cyrillic ones, checked before
 * the built-in table, and live only on this device.
 */

export type SpellingRule = { from: string; to: string };

export const RULES_KEY = "typemon-rules";
export const MAX_RULES = 20;

const FROM = /^[a-z']{1,4}$/;
const TO = /^[Ѐ-ӿ]{1,4}$/;

export function parseRules(raw: string | null): SpellingRule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is SpellingRule => !!r && typeof r.from === "string" && typeof r.to === "string")
      .map((r) => ({ from: r.from.toLowerCase(), to: r.to.toLowerCase() }))
      .filter((r) => FROM.test(r.from) && TO.test(r.to))
      .slice(0, MAX_RULES);
  } catch {
    return [];
  }
}

/** Why a rule was refused, in the user's language; null when it is fine. */
export function validateRule(from: string, to: string, existing: SpellingRule[]): string | null {
  const f = from.trim().toLowerCase();
  const t = to.trim().toLowerCase();
  if (!FROM.test(f)) return "Латин тал: 1–4 латин үсэг (эсвэл ') байх ёстой.";
  if (!TO.test(t)) return "Кирилл тал: 1–4 кирилл үсэг байх ёстой.";
  if (existing.some((r) => r.from === f)) return `«${f}» дүрэм аль хэдийн байна.`;
  if (existing.length >= MAX_RULES) return `Хамгийн ихдээ ${MAX_RULES} дүрэм.`;
  return null;
}

export function useSpellingRules() {
  const [raw, setRaw] = usePref(RULES_KEY, "");
  const rules = useMemo(() => parseRules(raw), [raw]);

  const add = useCallback(
    (from: string, to: string): string | null => {
      const error = validateRule(from, to, rules);
      if (error) return error;
      setRaw(JSON.stringify([...rules, { from: from.trim().toLowerCase(), to: to.trim().toLowerCase() }]));
      return null;
    },
    [rules, setRaw]
  );

  const remove = useCallback(
    (from: string) => {
      const next = rules.filter((r) => r.from !== from);
      setRaw(next.length ? JSON.stringify(next) : null);
    },
    [rules, setRaw]
  );

  return { rules, add, remove };
}
