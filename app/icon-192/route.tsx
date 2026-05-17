import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 38,
          fontSize: 104,
          fontWeight: 400,
          color: "#1D9E75",
          fontFamily: "sans-serif",
        }}
      >
        T
      </div>
    ),
    { width: 192, height: 192 }
  );
}
