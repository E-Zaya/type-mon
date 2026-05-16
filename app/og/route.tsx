import { ImageResponse } from "next/og";

export const runtime = "edge";

// Cache the generated image for a day. The content is static so this is safe;
// bumping a query param (?v=2) busts the cache when we ever change the design.
export const revalidate = 86400;

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: `${OG_WIDTH}px`,
          height: `${OG_HEIGHT}px`,
          background: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily:
            '"Inter", "Segoe UI", "Helvetica Neue", "Noto Sans", "Arial", sans-serif',
        }}
      >
        {/* Conversion demo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "28px",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.05em",
              fontFamily: "monospace",
            }}
          >
            Sain baina uu
          </div>
          <div style={{ fontSize: "20px", color: "#1D9E75" }}>↓</div>
          <div
            style={{
              fontSize: "72px",
              color: "#ffffff",
              fontWeight: 300,
              letterSpacing: "-0.02em",
            }}
          >
            Сайн байна уу
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: "36px",
              color: "#ffffff",
              fontWeight: 400,
              display: "flex",
            }}
          >
            <span>Type</span>
            <span style={{ color: "#1D9E75" }}>Mon</span>
          </div>
          <div
            style={{
              fontSize: "18px",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            type-mon.vercel.app
          </div>
        </div>
      </div>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
