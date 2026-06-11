import type { MetadataRoute } from "next";
import spotsData from "@/data/spots.json";
import type { Spot } from "@/lib/types";
import { SITE_URL } from "@/lib/structured-data";

const ALL_SPOTS = spotsData as Spot[];

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
