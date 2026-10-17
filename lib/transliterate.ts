/**
 * TypeMon — Mongolian Romanization to Cyrillic Transliterator
 *
 * The tables live in transliterate-rules.json so the Kotlin/Swift ports use
 * the same data; the expected outputs live in transliterate-fixtures.json.
 *
 * Key mappings decided by Zaya:
 *   Q → Ө,  W → Ү
 *   J → Ж,  H → Х,  SH → Ш,  CH → Ч,  TS → Ц
 *   AI → АЙ, OI → ОЙ, UI → УЙ, WI → ҮЙ
 *   AA → АА (long vowels by doubling)
 *   YI → Ы
 *   Ö → Ө, Ü → Ү      (for people used to the MNS 5217 romanization)
 *   ' → Ь,  '' → Ъ   (the curly ’ ‘ that phones insert count as ')
 *   _ between two letters → nothing; it keeps a digraph apart (unt_san → унтсан)
 */

import rules from './transliterate-rules.json' with { type: 'json' };
import exceptions from './transliterate-exceptions.json' with { type: 'json' };

type Mapping = [string, string];

/**
 * A dictionary maps a lowercase Latin word (without `_`) to its lowercase
 * Cyrillic spelling. Entries win over the digraph rules and also match as
 * a prefix, so suffixes still convert normally (batswh → батсүх,
 * batswhiin → батсүхийн).
 */
export type Dictionary = Record<string, string>;

/** Built-in exceptions: words the digraph rules get wrong (унтсан, Батсүх). */
export const EXCEPTIONS: Dictionary = exceptions.words;

export type TransliterateOptions = {
  /** Extra words, e.g. what the user taught the app. Win over EXCEPTIONS. */
  dictionary?: Dictionary;
  /** false = rules only, no built-in exceptions. For tests and tooling. */
  builtInExceptions?: boolean;
};

/** Multi-character mappings — ordered, first match wins. Lowercase values. */
const MULTI_CHAR_MAP: Mapping[] = rules.multi as Mapping[];

/** Single-character mappings. Keys are lowercase latin; values lowercase cyrillic. */
const SINGLE_CHAR_MAP: Record<string, string> = rules.single;

const SOFT_SIGN = rules.softSign;
const HARD_SIGN = rules.hardSign;

/** Straight apostrophe plus the curly quotes iOS/Android "smart punctuation" substitutes for it. */
const APOSTROPHES = new Set<string>(rules.apostrophes);

/** Typed between two letters to stop them forming a digraph. Dropped from the output. */
const SEPARATOR: string = rules.separator;

/** Latin letters the tables understand, in both cases. */
const LETTER = /[a-zA-ZöüÖÜ]/;
const LOWER = /[a-zöü]/;
const UPPER = /[A-ZÖÜ]/;

const isLatinLetter = (ch: string | undefined): boolean =>
  ch !== undefined && LETTER.test(ch);

const isWordChar = (ch: string | undefined): boolean =>
  ch !== undefined && (isLatinLetter(ch) || APOSTROPHES.has(ch) || ch === SEPARATOR);

/**
 * Apply casing from the original romanized slice to the cyrillic output.
 * - All uppercase input  → all uppercase output   (SAIN → САЙН)
 * - First letter uppercase → first letter uppercase (Sain → Сайн)
 * - All lowercase → all lowercase                  (sain → сайн)
 */
function applyCase(cyrLower: string, origSlice: string): string {
  const hasLetter = LETTER.test(origSlice);
  if (!hasLetter) return cyrLower;

  const allUpper = !LOWER.test(origSlice) && UPPER.test(origSlice);
  if (allUpper) return cyrLower.toUpperCase();

  const firstUpper = UPPER.test(origSlice[0]);
  if (firstUpper) return cyrLower.charAt(0).toUpperCase() + cyrLower.slice(1);

  return cyrLower;
}

/**
 * Is the word starting at `start` written in ALL CAPS?
 * Needs at least two letters so that a lone capital ("A", "I") stays title case.
 * Decides the case of Ь/Ъ, which have no letter of their own in the input.
 */
function isAllCapsWord(text: string, start: number): boolean {
  let letters = 0;
  for (let j = start; j < text.length && isWordChar(text[j]); j++) {
    const ch = text[j];
    if (LOWER.test(ch)) return false;
    if (UPPER.test(ch)) letters++;
  }
  return letters >= 2;
}

/** Case the dictionary's lowercase value like the typed word. */
function caseLikeWord(cyrLower: string, wordSlice: string, wordUpper: boolean): string {
  if (wordUpper) return cyrLower.toUpperCase();
  return applyCase(cyrLower, wordSlice);
}

/**
 * Longest dictionary key that is a prefix of the word starting at `start`.
 * Only whole letters count: the word must not contain `_` (the user was
 * explicit) and the key must be at least two letters.
 */
function dictionaryMatch(
  lower: string,
  start: number,
  dictionary: Dictionary
): { len: number; cyr: string } | null {
  let end = start;
  while (end < lower.length && isWordChar(lower[end])) end++;
  const word = lower.slice(start, end);
  if (word.includes(SEPARATOR)) return null;
  for (let len = word.length; len >= 2; len--) {
    const cyr = dictionary[word.slice(0, len)];
    if (cyr !== undefined) return { len, cyr };
  }
  return null;
}

/**
 * Convert a chunk of latin text into cyrillic.
 * Internal helper — does NOT understand the *...* escape syntax.
 */
function transliterateChunk(input: string, dictionary: Dictionary): string {
  // Some keyboards produce ö as "o" + combining diaeresis; compose first so
  // the tables see one character. Only here, so *...* stays verbatim.
  const text = input.normalize('NFC');
  let result = '';
  let i = 0;
  // Lowercase only the letters we map, so indices stay aligned with `text`
  // (String#toLowerCase can change the length for letters like İ).
  const lower = text.replace(/[A-ZÖÜ]/g, (c) => c.toLowerCase());
  let wordUpper = false;

  while (i < text.length) {
    const ch = text[i];

    // Word boundary: decide once per word whether it is ALL CAPS, and
    // whether the dictionary knows (the start of) this word.
    if (isWordChar(ch) && !isWordChar(text[i - 1])) {
      wordUpper = isAllCapsWord(text, i);
      const hit = dictionaryMatch(lower, i, dictionary);
      if (hit) {
        result += caseLikeWord(hit.cyr, text.slice(i, i + hit.len), wordUpper);
        i += hit.len;
        continue;
      }
    }

    // Separator between two letters: drop it, nothing else.
    if (ch === SEPARATOR) {
      if (!(isLatinLetter(text[i - 1]) && isLatinLetter(text[i + 1]))) result += ch;
      i++;
      continue;
    }

    // '' → Ъ, ' → Ь (in any mix of straight and curly apostrophes)
    if (APOSTROPHES.has(ch)) {
      if (APOSTROPHES.has(text[i + 1])) {
        result += wordUpper ? HARD_SIGN.toUpperCase() : HARD_SIGN;
        i += 2;
      } else {
        result += wordUpper ? SOFT_SIGN.toUpperCase() : SOFT_SIGN;
        i++;
      }
      continue;
    }

    // Try multi-character mappings first
    let matched = false;
    for (const [rom, cyr] of MULTI_CHAR_MAP) {
      const len = rom.length;
      if (lower.slice(i, i + len) === rom) {
        result += wordUpper ? cyr.toUpperCase() : applyCase(cyr, text.slice(i, i + len));
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const cyr = SINGLE_CHAR_MAP[lower[i]];
      result += cyr ? applyCase(cyr, ch) : ch;
      i++;
    }
  }

  return result;
}

/** A segment of the transliterated output. */
export type Segment = {
  /** The text to render. */
  text: string;
  /** Whether this segment was inside *...* and kept as-is (latin). */
  literal: boolean;
  /** Set by the loose-input layer (lib/loose.ts) when it replaced this word. */
  loose?: boolean;
};

/**
 * Transliterate romanized Mongolian into Cyrillic, with `*...*` escape syntax.
 * Anything wrapped in matching `*` is returned verbatim (latin preserved).
 * If a `*` has no matching closing `*`, it is treated as a normal character
 * and the surrounding text is still transliterated.
 *
 * Returns an array of segments so the UI can highlight literal sections.
 */
export function transliterateSegments(
  text: string,
  options: TransliterateOptions = {}
): Segment[] {
  const base = options.builtInExceptions === false ? {} : EXCEPTIONS;
  const dictionary: Dictionary = options.dictionary ? { ...base, ...options.dictionary } : base;
  const segments: Segment[] = [];

  // Find all matched *...* pairs. Greedy from left.
  // We deliberately do NOT match across multiple lines if a closing * is missing.
  let i = 0;
  while (i < text.length) {
    const star = text.indexOf('*', i);
    if (star === -1) {
      // No more stars — transliterate the rest.
      const tail = text.slice(i);
      if (tail) segments.push({ text: transliterateChunk(tail, dictionary), literal: false });
      break;
    }

    // Look for a matching closing *
    const close = text.indexOf('*', star + 1);
    if (close === -1) {
      // Unmatched opening * — transliterate everything (including the *).
      const tail = text.slice(i);
      if (tail) segments.push({ text: transliterateChunk(tail, dictionary), literal: false });
      break;
    }

    // Convert text before the opening *
    if (star > i) {
      segments.push({
        text: transliterateChunk(text.slice(i, star), dictionary),
        literal: false,
      });
    }

    // Literal content between * and * (excluding the stars themselves)
    const inner = text.slice(star + 1, close);
    if (inner.length > 0) {
      segments.push({ text: inner, literal: true });
    }
    // else: empty `**` — silently drop

    i = close + 1;
  }

  return segments;
}

/**
 * Transliterate romanized Mongolian text to Cyrillic.
 * Preserves spaces, newlines, punctuation, and digits as-is.
 * Supports `*latin*` escape syntax to keep latin words verbatim.
 *
 * @example
 * transliterate('Sain baina uu')               // → 'Сайн байна уу'
 * transliterate('MONGOL')                      // → 'МОНГОЛ'
 * transliterate("gov'")                        // → 'говь'
 * transliterate('mongolyin')                   // → 'монголын'
 * transliterate('unt_san')                     // → 'унтсан'
 * transliterate('Minii mergejil *Programmer*') // → 'Миний мэргэжил Programmer'
 */
export function transliterate(text: string, options: TransliterateOptions = {}): string {
  return transliterateSegments(text, options).map((s) => s.text).join('');
}
