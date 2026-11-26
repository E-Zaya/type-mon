import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, decodeResult, encodeBoard, encodeResult, parseResults, type WpmResult } from "./wpm-rank.ts";

const base: WpmResult = { mode: "cy", wpm: 45, accuracy: 95, chars: 300, words: 50, mistakes: 2, day: 20261017 };

test("a name travels in the link, cleaned", () => {
  const q = encodeResult({ ...base, name: "  Болд  !" });
  assert.match(q, /n=%D0%91%D0%BE%D0%BB%D0%B4/);
  const back = decodeResult(Object.fromEntries(new URLSearchParams(q).entries()));
  assert.equal(back?.name, "Болд");
  // No name, no n=
  assert.doesNotMatch(encodeResult(base), /n=/);
  assert.equal(cleanName("x".repeat(40)).length, 24);
  assert.equal(cleanName("<script>"), "script");
  assert.equal(cleanName(undefined), "");
});

test("parseResults reads share links, board links and bare queries, dropping duplicates", () => {
  const a = { ...base, name: "Болд" };
  const b = { ...base, wpm: 62, name: "Сараа" };
  const text = [
    `https://type-mon.vercel.app/wpm/r?${encodeResult(a)}`,
    `https://type-mon.vercel.app/wpm/r?${encodeResult(a)}`,
    `/wpm/board?${encodeBoard([b])}`,
    encodeResult(base),
    "not a link",
  ].join("\n");
  const results = parseResults(text);
  assert.deepEqual(
    results.map((r) => [r.wpm, r.name ?? ""]),
    [[45, "Болд"], [62, "Сараа"], [45, ""]]
  );
});

test("encodeBoard round-trips through parseResults", () => {
  const list = [base, { ...base, wpm: 70, name: "Тэмүүлэн" }];
  assert.deepEqual(parseResults(`/wpm/board?${encodeBoard(list)}`), list);
});
