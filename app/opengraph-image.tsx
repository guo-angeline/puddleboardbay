import { ImageResponse } from "next/og";
import spotsData from "@/data/spots.json";

export const alt = "Paddle to Water: paddleboard and kayak launch spots across the Bay Area";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#3730A3",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        <div style={{ display: "flex", fontSize: 96 }}>🚣</div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: "bold",
            color: "#fff",
            marginTop: 28,
            fontFamily: "serif",
            letterSpacing: "-1px",
          }}
        >
          Paddle to Water
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "rgba(255,255,255,0.75)",
            marginTop: 20,
            fontFamily: "sans-serif",
          }}
        >
          {`${spotsData.length} paddleboard & kayak spots across the Bay Area`}
        </div>
      </div>
    ),
    { ...size }
  );
}
