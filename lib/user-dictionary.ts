/**
 * Words the user taught the converter.
 *
 * Whenever the input contains a word with `_` between two letters
 * (unt_san), the pair "untsan" → "унтсан" is remembered, so the next time
 * the user types untsan without the underscore it still comes out right.
 * Learned words match whole words only (untsanaa is not untsan), because
 * a prefix learned from a typo (s_h → "sh") would otherwise rewrite every
 * word starting with it. The data never leaves the browser (localStorage).
 *
 * learnFromInput() is pure so it can be tested; the storage helpers wrap it.
 */

import { transliterate, type Dictionary } from "./transliterate.ts";

export const USER_DICTIONARY_KEY = "typemon-user-dictionary";
export const USER_DICTIONARY_EVENT = "typemon-user-dictionary-change";

/** Keep the dictionary small; the newest words win. */
export const USER_DICTIONARY_MAX = 500;

const LETTER = "a-zA-ZöüÖÜ'’‘";
/** A word that contains at least one `_` between two letters. */
const TAUGHT_WORD = new RegExp(`[${LETTER}]+(?:_[${LETTER}]+)+`, "g");

/** A storable key: 3–40 lowercase letters/apostrophes. Values: Cyrillic, up to 60 chars. */
const VALID_KEY = /^[a-zöü'’‘]{3,40}$/;
const VALID_VALUE = /^[а-яёөү'’‘]{1,60}$/;

export function isValidEntry(key: string, value: string): boolean {
  return VALID_KEY.test(key) && VALID_VALUE.test(value);
}

/**
 * Pairs to remember from one input: for every `a_b` word, the key is the
 * lowercase word without underscores and the value is its conversion.
 * Text inside *...* is ignored (it is not converted).
 */
export function learnFromInput(input: string): Dictionary {
  const learned: Dictionary = {};
  // Drop literal sections first so *snake_case* is not "taught".
  const outside = input.replace(/\*[^*]*\*/g, " ");
  for (const word of outside.match(TAUGHT_WORD) ?? []) {
    const key = word.replace(/_/g, "").toLowerCase();
    const value = transliterate(word).toLowerCase();
    if (isValidEntry(key, value) && value !== transliterate(key).toLowerCase()) {
      learned[key] = value;
    }
  }
  return learned;
}

/** Merge `learned` into `current`, newest last, capped at USER_DICTIONARY_MAX. */
export function mergeDictionary(current: Dictionary, learned: Dictionary): Dictionary {
  const entries = Object.entries(current).filter(([k]) => !(k in learned));
  entries.push(...Object.entries(learned));
  return Object.fromEntries(entries.slice(-USER_DICTIONARY_MAX));
}

function parse(raw: string | null): Dictionary {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Dictionary = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && isValidEntry(k, v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

const EMPTY: Dictionary = {};
let cachedRaw: string | null = null;
let cachedDict: Dictionary = EMPTY;

/** Snapshot for useSyncExternalStore: same object while storage is unchanged. */
export function readUserDictionary(): Dictionary {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(USER_DICTIONARY_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDict = parse(raw);
  }
  return cachedDict;
}

export function getServerUserDictionary(): Dictionary {
  return EMPTY;
}

export function subscribeUserDictionary(callback: () => void): () => void {
  window.addEventListener(USER_DICTIONARY_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(USER_DICTIONARY_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function write(dict: Dictionary) {
  try {
    if (Object.keys(dict).length === 0) window.localStorage.removeItem(USER_DICTIONARY_KEY);
    else window.localStorage.setItem(USER_DICTIONARY_KEY, JSON.stringify(dict));
    window.dispatchEvent(new Event(USER_DICTIONARY_EVENT));
  } catch {
    /* private mode: nothing is remembered, conversion still works */
  }
}

/** Learn from `input` and persist. Returns how many words are new or changed. */
export function teachFromInput(input: string): number {
  const learned = learnFromInput(input);
  const current = readUserDictionary();
  const changed = Object.entries(learned).filter(([k, v]) => current[k] !== v);
  if (changed.length === 0) return 0;
  write(mergeDictionary(current, learned));
  return changed.length;
}

export function clearUserDictionary() {
  write({});
}
