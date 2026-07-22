import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_SPOTS } from "@/lib/spots";
import HomeClient from "@/components/HomeClient";
import { SITE_NAME, spotUrl, spotDescription, spotJsonLd } from "@/lib/structured-data";


export function generateStaticParams() {
  return ALL_SPOTS.map((s) => ({ id: String(s.id) }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const spot = ALL_SPOTS.find((s) => s.id === Number(id));
  if (!spot) return {};

  const title = `${spot.water} Paddleboard Spot | ${SITE_NAME}`;
  const description = spotDescription(spot);
  const url = spotUrl(spot);
  // Spot-specific alt so shared previews and screen readers name the actual
  // spot, not a generic line. The image route's static `alt` export is the
  // same string for all 140 pages; overriding here per spot.
  const imageAlt = `${spot.water} paddleboard and kayak launch in ${
    spot.city ?? spot.region
  }, CA`;
  const image = { url: `${url}/opengraph-image`, width: 1200, height: 630, alt: imageAlt };

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SpotPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const spot = ALL_SPOTS.find((s) => s.id === Number(id));
  if (!spot) notFound();

  // Server-rendered link graph so crawlers can traverse all spot pages and
  // distribute link equity (HomeClient is client-only, emits no crawlable
  // anchors). Visually hidden, present in the static HTML.
  const related = ALL_SPOTS.filter(
    (s) => s.region === spot.region && s.id !== spot.id
  ).slice(0, 12);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(spotJsonLd(spot)) }}
      />
      {/* Item 81: this page's <h1>, and it has to be SERVER-rendered.
          The obvious fix (promote the drawer's title from h2 to h1) does
          nothing here: the drawer mounts client-side after an effect selects
          the spot, so `spot-sheet-title` is absent from the served HTML that
          crawlers actually read. Verified by fetch, which is why the item asked
          for that rather than for inspecting React.
          sr-only because the visible title arrives with the drawer a moment
          later; a visible one would render the name twice. */}
      <h1 className="sr-only">
        {spot.water}
        {spot.city ? `, ${spot.city}` : ""}: paddleboard and kayak launch
      </h1>
      <nav aria-label="More paddleboard spots" className="sr-only">
        <Link href="/">All Bay Area paddleboard and kayak spots</Link>
        <h2>More paddleboard spots in {spot.region}</h2>
        <ul>
          {related.map((s) => (
            <li key={s.id}>
              <Link href={`/spot/${s.id}`}>
                {s.water}
                {s.city ? `, ${s.city}` : ""}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <HomeClient initialSpotId={spot.id} />
    </>
  );
}
