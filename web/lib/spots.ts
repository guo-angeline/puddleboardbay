import spotsData from "@/data/spots.json";
import type { Spot } from "@/lib/types";

/**
 * The single source of spot data for the whole app.
 *
 * Import ALL_SPOTS from here. Do NOT `import spotsData from "@/data/spots.json"`
 * in a feature file: that bypasses the `hidden` filter below, and the bypass is
 * silent. This matters most on the two alert crons, where a missed filter would
 * push or email people toward a spot we have deliberately withheld.
 *
 * A hidden spot is withheld everywhere at once: list, map, /spot/[id] (including
 * generateStaticParams, so no page is built for it), sitemap, OG images, JSON-LD,
 * check-conditions, and send-email-alerts.
 */
const RAW = spotsData as Spot[];

export const ALL_SPOTS: Spot[] = RAW.filter((s) => !s.hidden);

/**
 * Every record including hidden ones. For data tooling and audits only, never
 * for a user-facing surface or an alert send.
 */
export const ALL_SPOTS_INCLUDING_HIDDEN: Spot[] = RAW;

export const HIDDEN_SPOTS: Spot[] = RAW.filter((s) => s.hidden === true);
