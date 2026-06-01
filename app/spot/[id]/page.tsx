import type { Metadata } from "next";
import { notFound } from "next/navigation";
import spotsData from "@/data/spots.json";
import type { Spot } from "@/lib/types";
import HomeClient from "@/components/HomeClient";

const ALL_SPOTS = spotsData as Spot[];
const SITE_URL = "https://sup-spots.vercel.app";

export function generateStaticParams() {
  return ALL_SPOTS.map((s) => ({ id: String(s.id) }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const spot = ALL_SPOTS.find((s) => s.id === Number(id));
  if (!spot) return {};

  const title = `${spot.water} Paddleboard Spot | PuddleboardBay`;
  const description = spot.notes
    ? spot.notes.slice(0, 155) + (spot.notes.length > 155 ? "…" : "")
    : `Launch info, fees, and conditions for ${spot.water} in ${spot.city ?? spot.region}, CA.`;
  const url = `${SITE_URL}/spot/${spot.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "PuddleboardBay", type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function SpotPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const spot = ALL_SPOTS.find((s) => s.id === Number(id));
  if (!spot) notFound();

  return <HomeClient initialSpotId={spot.id} />;
}
