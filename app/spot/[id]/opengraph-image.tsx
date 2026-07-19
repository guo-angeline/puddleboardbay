import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { ALL_SPOTS } from "@/lib/spots";
import { DIFFICULTY_LABEL } from "@/lib/types";


export const alt = "Paddleboard and kayak launch spot details on Paddle to Water";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const markSrc =
  "data:image/png;base64," +
  readFileSync(join(process.cwd(), "public/og-mark.png")).toString("base64");

export function generateStaticParams() {
  return ALL_SPOTS.map((s) => ({ id: String(s.id) }));
}

export default async function OGImage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const spot = ALL_SPOTS.find((s) => s.id === Number(id));

  if (!spot) {
    return new ImageResponse(
      (
        <div style={{ background: "#0B2A47", width: "100%", height: "100%", display: "flex" }} />
      ),
      { ...size }
    );
  }

  const feeLine =
    spot.has_fee === false
      ? "Free launch"
      : spot.has_fee === true && spot.fee_amount
      ? `$${spot.fee_amount} launch fee`
      : "";

  const meta = [spot.city, DIFFICULTY_LABEL[spot.difficulty], feeLine]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0B2A47",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "64px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 20,
            fontFamily: "sans-serif",
          }}
        >
          <img src={markSrc} width={44} height={44} alt="" style={{ display: "flex" }} />
          {`Paddle to Water  ·  ${spot.region}`}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 80,
            fontWeight: "bold",
            color: "#fff",
            lineHeight: 1.05,
            marginBottom: 28,
            fontFamily: "serif",
          }}
        >
          {spot.water}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "rgba(255,255,255,0.75)",
            fontFamily: "sans-serif",
          }}
        >
          {meta || " "}
        </div>
      </div>
    ),
    { ...size }
  );
}
