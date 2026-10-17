/**
 * Alternatives for words in the input, shown as chips under the output.
 * Two sources:
 *   ts     a word containing "ts" can mean ц or т+с (untsan → унцан / унтсан)
 *   loose  list words that differ only in ө/о, ү/у, й/ы, е/э (hol → хол / хөл)
 * Picking a chip rewrites the Latin word so the engine produces the pick,
 * so the choice is visible in the input and can be learned by saving.
 */

import { transliterate, type Dictionary } from "./transliterate.ts";
import { toLatin } from "./reverse.ts";
import { caseLike, looseKey, LOOSE_MIN_LENGTH, type LooseIndex } from "./loose.ts";

export type Candidate = {
  /** [start, end) of the Latin word in the input. */
  start: number;
  end: number;
  /** What the word converts to now. */
  current: string;
  /** The alternative Cyrillic. */
  candidate: string;
  /** Latin to put in place of the word so that it converts to `candidate`. */
  replacement: string;
  reason: "ts" | "loose";
};

const LATIN_WORD = /[a-zA-ZöüÖÜ'’‘_]+/g;
const CYR_WORD = /^[а-яёөүА-ЯЁӨҮ]+$/;

/** [start, end) ranges of matched *...* pairs, which are not converted. */
function literalRanges(input: string): [number, number][] {
  const ranges: [number, number][] = [];
  let i = 0;
  while (i < input.length) {
    const star = input.indexOf("*", i);
    if (star === -1) break;
    const close = input.indexOf("*", star + 1);
    if (close === -1) break;
    ranges.push([star, close + 1]);
    i = close + 1;
  }
  return ranges;
}

export function findCandidates(
  input: string,
  index: LooseIndex,
  dictionary?: Dictionary,
  limit = 8
): Candidate[] {
  const out: Candidate[] = [];
  const literals = literalRanges(input);
  const opts = dictionary ? { dictionary } : {};

  for (const m of input.matchAll(LATIN_WORD)) {
    const word = m[0];
    const start = m.index;
    const end = start + word.length;
    if (literals.some(([a, b]) => start >= a && end <= b)) continue;
    // The user already decided with _ ; offer nothing.
    if (word.includes("_")) continue;
    if (!/[a-zA-ZöüÖÜ]/.test(word)) continue;

    const current = transliterate(word, opts);
    const seen = new Set<string>([current]);
    const push = (c: Omit<Candidate, "start" | "end" | "current">) => {
      if (seen.has(c.candidate)) return;
      seen.add(c.candidate);
      out.push({ start, end, current, ...c });
    };

    // ts → т+с
    for (const ts of word.matchAll(/ts/gi)) {
      const split = `${word.slice(0, ts.index + 1)}_${word.slice(ts.index + 1)}`;
      const candidate = transliterate(split, opts);
      if (candidate !== current) push({ candidate, replacement: split, reason: "ts" });
    }

    // Loose folds against the word list
    if (CYR_WORD.test(current) && current.length >= LOOSE_MIN_LENGTH) {
      const lower = current.toLowerCase();
      for (const listWord of index.byKey.get(looseKey(lower)) ?? []) {
        if (listWord === lower) continue;
        const candidate = caseLike(listWord, current);
        push({ candidate, replacement: toLatin(candidate), reason: "loose" });
      }
    }

    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

/** The input with one candidate applied. */
export function applyCandidate(input: string, c: Candidate): string {
  return input.slice(0, c.start) + c.replacement + input.slice(c.end);
}
