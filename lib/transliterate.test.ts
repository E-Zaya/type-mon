import { test } from "node:test";
import assert from "node:assert/strict";
import { transliterate, transliterateSegments } from "./transliterate.ts";
import { MN_WORDS } from "./wpm-words.ts";
import fixtures from "./transliterate-fixtures.json" with { type: "json" };

/** Cyrillic → the Latin a TypeMon user would type (reverse of the main table). */
const REVERSE: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "ye", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "q", п: "p",
  р: "r", с: "s", т: "t", у: "u", ү: "w", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ъ: "''", ы: "yi", ь: "'", э: "e", ю: "yu", я: "ya",
};
const toLatin = (word: string) => [...word].map((c) => REVERSE[c] ?? c).join("");

// The shared fixtures are the contract every implementation must meet.
const groups = new Map<string, typeof fixtures.cases>();
for (const c of fixtures.cases) {
  const list = groups.get(c.group) ?? [];
  list.push(c);
  groups.set(c.group, list);
}
for (const [group, cases] of groups) {
  test(`fixtures: ${group}`, () => {
    for (const c of cases) {
      assert.equal(transliterate(c.input), c.expected, JSON.stringify(c.input));
    }
  });
}

test("fixtures have unique inputs", () => {
  const inputs = fixtures.cases.map((c) => c.input);
  assert.equal(new Set(inputs).size, inputs.length);
});

test("every word of the typing-test corpus round-trips", () => {
  const failures = MN_WORDS.filter((w) => transliterate(toLatin(w)) !== w);
  assert.deepEqual(failures, []);
});

test("*...* escape returns segments the UI can highlight", () => {
  assert.deepEqual(transliterateSegments("bi *React* surch baina"), [
    { text: "би ", literal: false },
    { text: "React", literal: true },
    { text: " сурч байна", literal: false },
  ]);
});
