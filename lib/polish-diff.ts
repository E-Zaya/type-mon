/**
 * Lightweight word-level diff for highlighting "before vs after" in the
 * polish UI. We don't need a full Myers diff — Mongolian sentences in this
 * app are short (< 500 chars), so an O(n*m) LCS table is fast enough and
 * keeps the implementation under 50 lines.
 *
 * Tokenization keeps whitespace and punctuation as separate tokens so that
 * "сайн" → "сайн," doesn't show as the whole word changing.
 */

export type DiffToken = {
  text: string;
  /** "same" = appears in both, "added" = only in after, "removed" = only in before. */
  kind: "same" | "added" | "removed";
};

/** Split a string into word + whitespace + punctuation tokens. */
function tokenize(s: string): string[] {
  // Match runs of letters/digits, or single non-letter chars. Unicode-aware
  // so Cyrillic words stay whole.
  const re = /[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu;
  return s.match(re) ?? [];
}

/** Classic LCS table → backtrack to produce a token-level diff. */
function lcsDiff(a: string[], b: string[]): DiffToken[] {
  const n = a.length;
  const m = b.length;
  // dp[i][j] = length of LCS of a[0..i-1] and b[0..j-1]
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const out: DiffToken[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out.push({ text: a[i - 1], kind: "same" });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      out.push({ text: a[i - 1], kind: "removed" });
      i--;
    } else {
      out.push({ text: b[j - 1], kind: "added" });
      j--;
    }
  }
  while (i > 0) {
    out.push({ text: a[i - 1], kind: "removed" });
    i--;
  }
  while (j > 0) {
    out.push({ text: b[j - 1], kind: "added" });
    j--;
  }
  return out.reverse();
}

/**
 * Produce two parallel token arrays — one for the "before" view (showing
 * removed text struck through) and one for the "after" view (showing
 * added text highlighted). Tokens marked "same" appear in both views.
 */
export function diffWords(
  before: string,
  after: string
): { beforeTokens: DiffToken[]; afterTokens: DiffToken[] } {
  const raw = lcsDiff(tokenize(before), tokenize(after));
  const beforeTokens = raw.filter((t) => t.kind !== "added");
  const afterTokens = raw.filter((t) => t.kind !== "removed");
  return { beforeTokens, afterTokens };
}
