import { ImageResponse } from "next/og";
import { decodeResult, modeLabel, percentile, quip, tierFor } from "@/lib/wpm-rank";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;
const FONT = '"Inter", "Segoe UI", "Helvetica Neue", "Noto Sans", "Arial", sans-serif';

/**
 * The share card. With a valid result in the query it draws that score;
 * without one it draws the generic invitation used by /wpm itself.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const result = decodeResult(params);

  if (!result) {
    return new ImageResponse(
      (
        <div style={{ width: WIDTH, height: HEIGHT, background: "#1a1a1a", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, fontFamily: FONT }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 28, color: "#1D9E75", letterSpacing: "0.1em" }}>TYPEMON ХУРД</div>
            <div style={{ fontSize: 68, color: "#fff", fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.1 }}>60 секундэд хэдэн үг бичих вэ?</div>
            <div style={{ fontSize: 30, color: "rgba(255,255,255,0.55)", display: "flex", gap: 24 }}>
              <span>🐫 Тэмээ</span><span>🐎 Морь</span><span>🦅 Бүргэд</span><span>⚡ Өртөөний элч</span>
            </div>
          </div>
          <Footer />
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    );
  }

  const tier = tierFor(result.wpm);
  const pct = percentile(result.wpm, result.mode);

  return new ImageResponse(
    (
      <div style={{ width: WIDTH, height: HEIGHT, background: "#1a1a1a", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <div style={{ width: 240, height: 240, borderRadius: 40, background: "rgba(29,158,117,0.12)", border: "2px solid rgba(29,158,117,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 150 }}>
            {tier.emoji}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Satori needs one text node per box unless the box is a flex container. */}
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em" }}>{`${modeLabel(result.mode).toUpperCase()} · 60 СЕК`}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontSize: 150, color: "#fff", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1 }}>{result.wpm}</span>
              <span style={{ fontSize: 40, color: "rgba(255,255,255,0.5)" }}>WPM</span>
            </div>
            <div style={{ fontSize: 56, color: "#1D9E75", fontWeight: 300 }}>{tier.name}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 34, color: "#fff" }}>{`Монголчуудын ${pct}%-иас хурдан`}</div>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.6)" }}>{quip(result)}</div>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.6)" }}>{`Үнэн зөв ${result.accuracy}% · ${result.words} үг · Чи давж чадах уу?`}</div>
        </div>

        <Footer />
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

function Footer() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div style={{ fontSize: 36, color: "#fff", display: "flex" }}>
        <span>Type</span>
        <span style={{ color: "#1D9E75" }}>Mon</span>
      </div>
      <div style={{ fontSize: 20, color: "rgba(255,255,255,0.3)" }}>type-mon.vercel.app/wpm</div>
    </div>
  );
}
