import { ImageResponse } from "next/og";

const SIZE = 192;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2D6A8F",
          fontSize: SIZE * 0.55,
        }}
      >
        🚣
      </div>
    ),
    { width: SIZE, height: SIZE }
  );
}
