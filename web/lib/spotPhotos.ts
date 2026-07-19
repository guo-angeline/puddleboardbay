import manifest from "@/data/spot-photos.json";

/**
 * Item 31: per-spot photos. Two provenances share this manifest:
 *   - Wikimedia/Wikidata/Openverse picks (vision-curated 2026-07-18). CC-BY /
 *     CC-BY-SA require attribution, so `author` + `license` + `source_page`
 *     are present and MUST render wherever the photo shows.
 *   - Owner first-party photos (`source: "owner"`, added 2026-07-18). The owner
 *     took these, so they carry NO attribution and render no credit overlay.
 * Self-hosted sized derivatives under `public/spot-photos/`. Not every spot has
 * one; the rest render no photo (a wrong photo is worse than none).
 *
 * Attribution fields are optional because owner photos omit them. Render the
 * credit line only when `author` is present (see SpotDrawer figcaption gate).
 */
export interface SpotPhoto {
  /** Absolute path under /public, e.g. "/spot-photos/12.jpg". */
  file: string;
  /** "owner" for first-party photos; the harvest source otherwise. */
  source?: string;
  /** Present only on third-party photos that legally require credit. */
  author?: string;
  license?: string;
  license_url?: string | null;
  source_page?: string;
}

const PHOTOS = (manifest as { photos: Record<string, SpotPhoto> }).photos;

export function getSpotPhoto(id: number): SpotPhoto | null {
  return PHOTOS[String(id)] ?? null;
}
