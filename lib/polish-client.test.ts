import { test } from "node:test";
import assert from "node:assert/strict";
import { POLISH_MESSAGES, requestPolish } from "./polish-client.ts";

/** A fetch that answers every call with the given status and body. */
function fakeFetch(status: number, body: unknown): typeof fetch {
  return async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
}

test("sends the text as JSON to /api/polish", async () => {
  let seenUrl = "";
  let seenBody = "";
  const spy: typeof fetch = async (url, init) => {
    seenUrl = String(url);
    seenBody = String(init?.body);
    return new Response(JSON.stringify({ ok: true, polished: "x", changes: [] }));
  };
  await requestPolish("сайн уу", spy);
  assert.equal(seenUrl, "/api/polish");
  assert.deepEqual(JSON.parse(seenBody), { text: "сайн уу" });
});

test("a successful answer becomes a done status", async () => {
  const status = await requestPolish(
    "сайн уу",
    fakeFetch(200, {
      ok: true,
      polished: "Сайн уу?",
      changes: [{ before: "сайн уу", after: "Сайн уу?", reason: "том үсэг" }],
      remaining: 9,
    })
  );
  assert.deepEqual(status, {
    kind: "done",
    source: "сайн уу",
    polished: "Сайн уу?",
    changes: [{ before: "сайн уу", after: "Сайн уу?", reason: "том үсэг" }],
  });
});

test("API error codes map to their messages", async () => {
  const cases: [number, string, string][] = [
    [400, "TOO_LONG", POLISH_MESSAGES.tooLong],
    [500, "NOT_CONFIGURED", POLISH_MESSAGES.notConfigured],
    [429, "QUOTA_EXCEEDED", POLISH_MESSAGES.quotaExceeded],
    [500, "UPSTREAM_ERROR", POLISH_MESSAGES.upstream],
    [500, "SOMETHING_NEW", POLISH_MESSAGES.upstream],
  ];
  for (const [httpStatus, code, message] of cases) {
    const status = await requestPolish("x", fakeFetch(httpStatus, { ok: false, error: code }));
    assert.deepEqual(status, { kind: "error", message }, code);
  }
});

test("a 200 without polished text is still an error", async () => {
  const status = await requestPolish("x", fakeFetch(200, { ok: true, polished: "" }));
  assert.deepEqual(status, { kind: "error", message: POLISH_MESSAGES.upstream });
});

test("non-JSON bodies and thrown fetches do not throw", async () => {
  assert.deepEqual(await requestPolish("x", fakeFetch(502, "<html>bad gateway</html>")), {
    kind: "error",
    message: POLISH_MESSAGES.upstream,
  });
  const failing: typeof fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  assert.deepEqual(await requestPolish("x", failing), {
    kind: "error",
    message: POLISH_MESSAGES.network,
  });
});
