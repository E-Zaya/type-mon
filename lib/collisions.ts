/**
 * Finds Cyrillic words that the converter cannot produce from their plain
 * Latin spelling (no `_`): mostly т+с and с+х, which the digraph rules read
 * as ц and ш. Run it over any word or name list to grow
 * transliterate-exceptions.json instead of hunting by hand.
 */

import { transliterate, type Dictionary } from "./transliterate.ts";
import { toLatin } from "./reverse.ts";

/**
 * The plain Latin spelling a user types for a Cyrillic word: the typemon
 * style of toLatin() with its round-trip `_` removed, because the point is
 * to see what happens when nobody types the underscore.
 */
export function toLatinNaive(word: string): string {
  return toLatin(word.toLowerCase(), "typemon").replace(/_/g, "");
}

export type Collision = {
  /** The Cyrillic word that should come out. */
  word: string;
  /** What a user would type for it. */
  latin: string;
  /** What the converter produces instead. */
  got: string;
};

/**
 * Words in `words` whose naive Latin spelling does not convert back to them.
 * Pass the dictionary you would ship (EXCEPTIONS plus candidates) to see
 * what is still uncovered.
 */
export function findCollisions(words: Iterable<string>, dictionary?: Dictionary): Collision[] {
  const out: Collision[] = [];
  for (const raw of words) {
    const word = raw.trim().toLowerCase();
    if (!word) continue;
    const latin = toLatinNaive(word);
    const got = transliterate(latin, dictionary ? { dictionary } : {});
    if (got !== word) out.push({ word, latin, got });
  }
  return out;
}
