export type Difficulty = "flatwater" | "bay" | "river" | "unknown";

export interface Spot {
  id: number;
  region: string;
  city: string | null;
  water: string;
  notes: string | null;
  lat: number;
  lng: number;
  geocode_display: string | null;
  difficulty: Difficulty;
  fee_amount: number | null;
  has_fee: boolean | null;
  power_boats: boolean | null;
  tide_sensitive: boolean;
  /**
   * Tri-state like `has_fee`: true (dogs confirmed OK) | false (confirmed not) |
   * null (unknown). 26 records hold null and this was typed `boolean`, so the
   * unchecked `spotsData as Spot[]` cast in lib/spots.ts made TypeScript believe
   * a lie. Both call sites use truthiness, so null already behaves as "no badge",
   * which is the right render for unknown but is indistinguishable from a
   * confirmed no. Do not add a `=== false` branch without deciding what null means.
   */
  dog_friendly: boolean | null;
  rentals_available: boolean;
  /** Tri-state; 1 record holds null. Same reasoning as `dog_friendly`. */
  inspection_required: boolean | null;
  /**
   * Withhold this spot from every surface: list, map, /spot/[id], sitemap,
   * JSON-LD, and BOTH alert crons. Absent/false = visible (the default).
   *
   * Set when a record cannot be trusted, not merely when it needs a fix. The
   * 2026-07-16 coordinate audit found records that describe put-ins which do
   * not appear to exist (see reports/coord-audit-2026-07-16.md). Filtering
   * lives in lib/spots.ts; never read data/spots.json directly.
   */
  hidden?: boolean;
  /** Why this spot is hidden, and what would un-hide it. Required when hidden. */
  hidden_reason?: string;
  /**
   * The owner's own 1.0-5.0 rating of the paddle, entered by hand (item 39,
   * 2026-07-16). Absent = unrated, which is not a gap: 24 of 142 records are
   * deliberately blank and must render nothing at all.
   *
   * This is NOT the item 39 weighted score, and the two must never be blended.
   * The rubric (D15) scored the PUT-IN: ramp, parking, launch traffic. This
   * rates THE PADDLE. They correlate at 0.04 against researcher A and -0.10
   * against B, while A and B correlate 0.52 with each other, so they are
   * answers to different questions, not two estimates of one quantity. China
   * Camp is 3.6 on the rubric and 5.0 here and both are correct.
   *
   * It is also not an aggregate. There is a population of one, so never render
   * it as "average", never pair it with a review count, and never let a second
   * source feed this field. See reports/paddle-score-owner-ratings-2026-07-16.md
   * for the discrimination analysis, including the regions where this field
   * carries no information (East Bay: 29 spots inside a 0.4-wide band).
   */
  owner_rating?: number;
}

export const REGIONS = [
  "South Bay",
  "Peninsula",
  "East Bay",
  "San Francisco",
  "North Bay",
  "Sacramento",
  "Sierra Nevada",
  "Central Valley",
  "Central Coast",
] as const;

export const DIFFICULTIES: Difficulty[] = ["flatwater", "bay", "river"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  flatwater: "Flatwater",
  bay: "Open water",
  river: "River",
  unknown: "Unknown",
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  flatwater: "#12A5B0",
  bay:       "#0E6FD1",
  river:     "#E06636",
  unknown:   "#8AA0B4",
};

export const DIFFICULTY_LEGEND = [
  { color: DIFFICULTY_COLOR.flatwater, label: DIFFICULTY_LABEL.flatwater },
  { color: DIFFICULTY_COLOR.bay,       label: DIFFICULTY_LABEL.bay },
  { color: DIFFICULTY_COLOR.river,     label: DIFFICULTY_LABEL.river },
] as const;
