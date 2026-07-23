import manifest from "@/data/spot-photos.json";

/**
 * Item 31: per-spot photos. Four provenances share this manifest:
 *   - Wikimedia/Wikidata/Openverse picks (vision-curated 2026-07-18). CC-BY /
 *     CC-BY-SA require attribution, so `author` + `license` + `source_page`
 *     are present and MUST render wherever the photo shows.
 *   - Owner first-party photos (`source: "owner"`, added 2026-07-18). The owner
 *     took these, so they carry NO attribution and render no credit overlay.
 *   - Permission-sourced photos (`source: "permission"`). These record the
 *     photographer in `author` and render a plain credit without a license or
 *     source URL.
 *   - Public-domain picks (CC0 / PD, e.g. spot 18). The licence waives every
 *     condition, so no credit is owed, but we still record who shot it and
 *     where it came from. `attribution_required: false` suppresses the overlay
 *     while keeping that provenance auditable.
 * Self-hosted sized derivatives under `public/spot-photos/`. Not every spot has
 * one; the rest render no photo (a wrong photo is worse than none).
 *
 * Permission photos render their plain author credit. Other photos render the
 * linked credit only when `author` is present AND attribution is not explicitly
 * waived (see the SpotDrawer figcaption gate).
 *
 * NEW SURFACE WARNING (item 112, 2026-07-22): the on-page use shows the photo
 * UNALTERED beside a separate caption, which is a collection, no adaptation. The
 * moment a surface FLATTENS the photo with overlays into one image (the OG card
 * composites gradient + text + wordmark into a PNG), it becomes a MODIFIED
 * derivative: CC BY/BY-SA then also require a "(modified)" indicator, and BY-SA
 * share-alike attaches to that composite. So any FUTURE photo surface (e.g. a
 * shareable conditions card) must re-run the IP gate, not assume item 31's
 * clearance carries. The `opengraph-image.tsx` buildCredit() is the reference. Never set
 * `attribution_required: false` on a CC-BY / CC-BY-SA photo: those licences
 * require the credit, and `spot-photos.test.ts` fails the build if you do.
 */
export interface SpotPhoto {
  /** Absolute path under /public, e.g. "/spot-photos/12.jpg". */
  file: string;
  /** "owner" or "permission" for those provenances; harvest source otherwise. */
  source?: string;
  /** Present on licensed and permission photos. Absent on owner photos. */
  author?: string;
  /** Absent on owner and permission photos. */
  license?: string;
  license_url?: string | null;
  /** Absent on owner and permission photos. */
  source_page?: string;
  /**
   * Set `false` only for CC0 / public-domain photos, where provenance is worth
   * recording but no credit is legally owed. Omitted (undefined) means the
   * credit renders, so CC-BY / CC-BY-SA stay covered by default.
   */
  attribution_required?: boolean;
}

const PHOTOS = (manifest as { photos: Record<string, SpotPhoto> }).photos;

export function getSpotPhoto(id: number): SpotPhoto | null {
  return PHOTOS[String(id)] ?? null;
}
