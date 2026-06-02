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
  dog_friendly: boolean;
  rentals_available: boolean;
  inspection_required: boolean;
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
  bay: "Ocean",
  river: "River",
  unknown: "Unknown",
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  flatwater: "#4E6639",
  bay:       "#2D6A8F",
  river:     "#B45309",
  unknown:   "#6B7280",
};

export const DIFFICULTY_LEGEND = [
  { color: DIFFICULTY_COLOR.flatwater, label: DIFFICULTY_LABEL.flatwater },
  { color: DIFFICULTY_COLOR.bay,       label: DIFFICULTY_LABEL.bay },
  { color: DIFFICULTY_COLOR.river,     label: DIFFICULTY_LABEL.river },
] as const;
