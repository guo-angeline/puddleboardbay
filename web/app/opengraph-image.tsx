import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { ALL_SPOTS } from "@/lib/spots";

export const alt = "Paddle to Water: paddleboard and kayak launch spots across the Bay Area";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const markSrc =
  "data:image/png;base64," +
  readFileSync(join(process.cwd(), "public/og-mark.png")).toString("base64");

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0B2A47",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img src={markSrc} width={200} height={200} alt="" style={{ display: "flex" }} />
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: "bold",
            color: "#fff",
            marginTop: 36,
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
          {`${ALL_SPOTS.length} paddleboard & kayak spots across the Bay Area`}
        </div>
      </div>
    ),
    { ...size }
  );
}
