import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";

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
  if (spot.notes) {
    return spot.notes.length > 155 ? spot.notes.slice(0, 155) + "…" : spot.notes;
  }
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
