import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 102,
          fontSize: 278,
          fontWeight: 400,
          color: "#1D9E75",
          fontFamily: "sans-serif",
        }}
      >
        T
      </div>
    ),
    { width: 512, height: 512 }
  );
}
