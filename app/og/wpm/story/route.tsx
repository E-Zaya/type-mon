import { ImageResponse } from "next/og";
import { decodeResult, modeLabel, percentile, quip, tierFor } from "@/lib/wpm-rank";

export const runtime = "edge";

/* Instagram / Facebook story size. The middle third is what stays visible
   once the app overlays its own UI, so the number sits there. */
const WIDTH = 1080;
const HEIGHT = 1920;
const FONT = '"Inter", "Segoe UI", "Helvetica Neue", "Noto Sans", "Arial", sans-serif';

/** Vertical share card for stories. Same query as /og/wpm. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const result = decodeResult(params);

  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  const tier = tierFor(result.wpm);
  const pct = percentile(result.wpm, result.mode);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          background: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "200px 90px 180px",
          fontFamily: FONT,
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 34, color: "#1D9E75", letterSpacing: "0.14em" }}>TYPEMON ХУРД</div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em" }}>
            {`${modeLabel(result.mode).toUpperCase()} · 60 СЕК`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
          <div
            style={{
              width: 360,
              height: 360,
              borderRadius: 72,
              background: "rgba(29,158,117,0.12)",
              border: "3px solid rgba(29,158,117,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 220,
            }}
          >
            {tier.emoji}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <span style={{ fontSize: 260, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1 }}>{result.wpm}</span>
            <span style={{ fontSize: 56, color: "rgba(255,255,255,0.5)" }}>WPM</span>
          </div>
          <div style={{ fontSize: 76, color: "#1D9E75", fontWeight: 300, textAlign: "center" }}>{tier.name}</div>
          <div style={{ fontSize: 44, textAlign: "center" }}>{`Монголчуудын ${pct}%-иас хурдан`}</div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.6)", textAlign: "center", maxWidth: 880 }}>{quip(result)}</div>
          <div style={{ fontSize: 34, color: "rgba(255,255,255,0.6)" }}>{`Үнэн зөв ${result.accuracy}% · ${result.words} үг`}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ fontSize: 44 }}>Чи давж чадах уу?</div>
          <div style={{ fontSize: 48, display: "flex" }}>
            <span>Type</span>
            <span style={{ color: "#1D9E75" }}>Mon</span>
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.35)" }}>type-mon.vercel.app/wpm</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
