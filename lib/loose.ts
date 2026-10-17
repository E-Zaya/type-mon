/**
 * "Loose input": people texting in Latin write onoodor for өнөөдөр and
 * ugui for үгүй, dropping the q/w distinction. The strict engine turns that
 * into оноодор / угуй. This layer looks each converted word up in a word
 * list with o/ө, u/ү, й/ы and е/э folded together and, when exactly one
 * list word matches, uses it instead.
 *
 * It only ever replaces a word with a known word, never invents one, and a
 * word that is already in the list is left alone.
 */

import type { Segment } from "./transliterate.ts";

/** Folds the letters loose typing confuses. Lowercase in, lowercase out. */
export function looseKey(word: string): string {
  return word
    .toLowerCase()
    .replace(/ө/g, "о")
    .replace(/ү/g, "у")
    .replace(/ы/g, "й")
    .replace(/е/g, "э");
}

export type LooseIndex = {
  words: Set<string>;
  /** looseKey → the list words that fold to it. */
  byKey: Map<string, string[]>;
};

export function buildLooseIndex(wordList: Iterable<string>): LooseIndex {
  const words = new Set<string>();
  const byKey = new Map<string, string[]>();
  for (const raw of wordList) {
    const w = raw.toLowerCase();
    if (!w || words.has(w)) continue;
    words.add(w);
    const key = looseKey(w);
    const list = byKey.get(key) ?? [];
    list.push(w);
    byKey.set(key, list);
  }
  return { words, byKey };
}

/**
 * The list word `word` should have been, or null when `word` is already a
 * list word, matches nothing, or matches more than one.
 */
export function looseMatch(word: string, index: LooseIndex): string | null {
  const lower = word.toLowerCase();
  if (index.words.has(lower)) return null;
  const candidates = index.byKey.get(looseKey(lower));
  if (!candidates || candidates.length !== 1) return null;
  return candidates[0] === lower ? null : candidates[0];
}

const CYR_WORD = /[а-яёөү]+/giu;
const CYR_UPPER = /[А-ЯЁӨҮ]/;

function caseLike(lower: string, original: string): string {
  const letters = [...original];
  const upper = letters.filter((c) => CYR_UPPER.test(c)).length;
  if (upper === 0) return lower;
  if (upper === letters.length && letters.length >= 2) return lower.toUpperCase();
  if (CYR_UPPER.test(original[0])) return lower.charAt(0).toUpperCase() + lower.slice(1);
  return lower;
}

/**
 * Apply loose matching to the converted segments. Replaced words become
 * their own segments with `loose: true` so the UI can mark them; literal
 * (*...*) segments are never touched.
 */
export function applyLoose(segments: Segment[], index: LooseIndex): Segment[] {
  const out: Segment[] = [];
  for (const seg of segments) {
    if (seg.literal) {
      out.push(seg);
      continue;
    }
    let last = 0;
    let plain = "";
    for (const m of seg.text.matchAll(CYR_WORD)) {
      const word = m[0];
      const fixed = looseMatch(word, index);
      if (fixed === null) continue;
      plain += seg.text.slice(last, m.index);
      if (plain) out.push({ text: plain, literal: false });
      plain = "";
      out.push({ text: caseLike(fixed, word), literal: false, loose: true });
      last = m.index + word.length;
    }
    plain += seg.text.slice(last);
    if (plain) out.push({ text: plain, literal: false });
  }
  return out;
}

/* ---- the on/off setting, stored per browser ---- */

export const LOOSE_KEY = "typemon-loose";
export const LOOSE_EVENT = "typemon-loose-change";

export function readLooseEnabled(): boolean {
  try {
    return window.localStorage.getItem(LOOSE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getServerLooseEnabled(): boolean {
  return false;
}

export function subscribeLoose(callback: () => void): () => void {
  window.addEventListener(LOOSE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(LOOSE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function setLooseEnabled(enabled: boolean) {
  try {
    if (enabled) window.localStorage.setItem(LOOSE_KEY, "1");
    else window.localStorage.removeItem(LOOSE_KEY);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(LOOSE_EVENT));
}
