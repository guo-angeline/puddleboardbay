import type { MetadataRoute } from "next";
import { ALL_SPOTS } from "@/lib/spots";
import { SITE_URL } from "@/lib/structured-data";

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
