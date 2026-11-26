import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCandidate, findCandidates } from "./candidates.ts";
import { buildLooseIndex } from "./loose.ts";
import { transliterate } from "./transliterate.ts";
import { MN_WORDS } from "./wpm-words.ts";

const index = buildLooseIndex([...MN_WORDS, "хөл", "хол"]);

test("a word with ts offers the т+с reading", () => {
  const [c] = findCandidates("bi otson", index);
  assert.deepEqual(c, {
    start: 3,
    end: 8,
    current: "оцон",
    candidate: "отсон",
    replacement: "ot_son",
    reason: "ts",
  });
  assert.equal(applyCandidate("bi otson", c), "bi ot_son");
  assert.equal(transliterate(applyCandidate("bi otson", c)), "би отсон");
});

test("loose folds offer the list words that differ in ө/ү/й/е", () => {
  const cands = findCandidates("ugui", index);
  assert.deepEqual(
    cands.map((c) => [c.candidate, c.replacement, c.reason]),
    [["үгүй", "wgwi", "loose"]]
  );
  // Short words are not offered (same rule as loose mode)
  assert.deepEqual(findCandidates("hol", index), []);
  const [c] = findCandidates("Onoodor", index);
  assert.equal(c.candidate, "Өнөөдөр");
  assert.equal(transliterate(c.replacement), "Өнөөдөр");
});

test("every replacement really produces its candidate", () => {
  for (const input of ["untsan Batswh hol ugui onoodor", "TSOGTSAIHAN", "Hun"]) {
    for (const c of findCandidates(input, index)) {
      assert.equal(transliterate(c.replacement), c.candidate, `${input}: ${c.replacement}`);
    }
  }
});

test("no candidates for decided, literal, or plain words", () => {
  assert.deepEqual(findCandidates("unt_san", index), []);
  assert.deepEqual(findCandidates("*otson*", index), []);
  assert.deepEqual(findCandidates("sain baina uu", index), []);
  assert.deepEqual(findCandidates("1990 on", index), []);
  // Short words are left alone by the loose source
  assert.deepEqual(findCandidates("ug", index), []);
});

test("the user dictionary is respected and the limit holds", () => {
  // otson is already taught: its current reading is the learned one, and the
  // ts split gives the same result, so nothing to offer.
  assert.deepEqual(findCandidates("otson", index, { otson: "отсон" }), []);
  const many = findCandidates("otson ".repeat(20), index, undefined, 3);
  assert.equal(many.length, 3);
});
