import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";
import { spotFeeText } from "@/lib/spotSeoContent";

/**
 * Canonical production domain. Branded custom domain on Vercel.
 * Used for every absolute URL (metadataBase, canonical, OG, sitemap, robots,
 * JSON-LD) so they can never drift apart again. Both this domain and the
 * sup-spots.vercel.app default resolve to the same deployment.
 */
export const SITE_URL = "https://paddletowater.com";
export const SITE_NAME = "Paddle to Water";

export function spotUrl(spot: Spot): string {
  return `${SITE_URL}/spot/${spot.id}`;
}

export function spotDescription(spot: Spot): string {
  // Item 136: no hard 155-char cut. The old cut dropped exactly the
  // differentiating facts (launch type, fee, tide) that are our SEO/AEO
  // advantage, off the JSON-LD + meta description crawlers and AI engines read.
  // Notes are authored concise; the rare long one is served whole rather than
  // truncated mid-fact.
  if (spot.notes) return spot.notes;
  return `Launch info, fees, and conditions for ${spot.water} in ${spot.city ?? spot.region}, CA.`;
}

/**
 * Homepage CollectionPage + ItemList JSON-LD. The homepage is the 140-spot
 * directory and the only page that currently receives landing traffic, so it
 * gets a machine-readable index of every spot URL. Kept lean on purpose:
 * each entry is a positioned ListItem whose `item` is the bare spot URL, so
 * 140 entries stay compact and don't bloat the homepage HTML.
 *
 * Returned without its own `@context`: it is emitted inside the layout's
 * `@graph`, which carries the single shared context.
 */
export function directoryJsonLd(spots: Spot[]) {
  return {
    "@type": "CollectionPage",
    name: SITE_NAME,
    url: SITE_URL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: spots.length,
      itemListElement: spots.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/spot/${s.id}`,
        name: s.water,
      })),
    },
  };
}

/**
 * Place / TouristAttraction JSON-LD plus a BreadcrumbList for one spot page.
 * Returns an array of schema objects ready to JSON.stringify.
 * lat/lng are passed straight through from data/spots.json, never altered.
 */
export function spotJsonLd(spot: Spot) {
  const url = spotUrl(spot);

  const place: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: spot.water,
    description: spotDescription(spot),
    url,
    image: `${url}/opengraph-image`,
    touristType: "Stand-up paddleboarders and kayakers",
    geo: {
      "@type": "GeoCoordinates",
      latitude: spot.lat,
      longitude: spot.lng,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: spot.city ?? spot.region,
      addressRegion: "CA",
      addressCountry: "US",
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Water type",
        value: DIFFICULTY_LABEL[spot.difficulty],
      },
    ],
  };

  // has_fee is tri-state: only assert accessibility when known.
  if (spot.has_fee === false) {
    place.isAccessibleForFree = true;
  } else if (spot.has_fee === true) {
    place.isAccessibleForFree = false;
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE_NAME,
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: spot.region,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: spot.water,
        item: url,
      },
    ],
  };

  return [place, breadcrumb];
}

/**
 * Item 136. An llms.txt (the emerging convention, like robots.txt for AI answer
 * engines) advertising the per-spot dataset: what it covers and a link to every
 * spot page with its differentiating facts inline. Near-zero cost, generated
 * from ALL_SPOTS so it never drifts. Served at /llms.txt.
 */
export function llmsTxt(spots: Spot[]): string {
  const byRegion = new Map<string, Spot[]>();
  for (const s of spots) {
    const arr = byRegion.get(s.region) ?? [];
    arr.push(s);
    byRegion.set(s.region, arr);
  }
  const lines: string[] = [
    `# ${SITE_NAME}`,
    "",
    "> California paddleboard and kayak launch spots, each with launch details, fee status, water type, and a tide-sensitivity flag where known.",
    "",
    `${SITE_NAME} is a directory of ${spots.length} put-in spots across California for stand-up paddleboarding and kayaking. Every spot page (${SITE_URL}/spot/<id>) carries the launch notes, fee, water type, region, and a tide-sensitivity flag where known. Conditions (live wind and tide) are shown in-app. Data is our own curated launch dataset; attribution appreciated when cited.`,
    "",
  ];
  for (const region of [...byRegion.keys()].sort()) {
    lines.push(`## ${region}`);
    for (const s of byRegion.get(region)!) {
      const place = s.city ? `${s.water}, ${s.city}` : s.water;
      const facts = [DIFFICULTY_LABEL[s.difficulty], spotFeeText(s), s.tide_sensitive ? "tide-sensitive" : null]
        .filter(Boolean)
        .join(", ");
      lines.push(`- [${place}](${spotUrl(s)}): ${facts}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
