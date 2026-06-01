import type { MetadataRoute } from "next";
import spotsData from "@/data/spots.json";
import type { Spot } from "@/lib/types";

const ALL_SPOTS = spotsData as Spot[];
const SITE_URL = "https://sup-spots.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...ALL_SPOTS.map((s) => ({
      url: `${SITE_URL}/spot/${s.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
