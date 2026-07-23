import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";

/**
 * Item 136. The rich per-spot facts, as PLAIN DATA, so the static spot page can
 * server-render them into the served HTML (where crawlers and AI answer engines
 * read them). The interactive drawer stays the visible UX; this is the same
 * facts as text in the page body, not a new UI. Pure, no DOM.
 */

/** Human fee line, mirroring the drawer's tri-state (has_fee null = unknown). */
export function spotFeeText(spot: Spot): string {
  if (spot.has_fee === false) return "Free to launch";
  if (spot.has_fee === true) {
    return spot.fee_amount ? `$${spot.fee_amount} launch fee` : "Launch fee";
  }
  return "Launch fee not confirmed";
}

/**
 * A static conditions/tide summary derived from the spot's OWN fields (never
 * live wind/tide, which is client-only): water type + tide sensitivity. This is
 * the durable, indexable version of the "conditions" the drawer fetches live.
 */
export function spotConditionsSummary(spot: Spot): string {
  const kind = DIFFICULTY_LABEL[spot.difficulty] ?? "Paddling";
  const tide = spot.tide_sensitive
    ? "Tide-sensitive: check the tide before launching, since water level and current change with it."
    : "Not tide-sensitive.";
  return `${kind} launch. ${tide}`;
}

/** Term/definition facts for the page's <dl>. Only meaningful, known entries. */
export function spotFacts(spot: Spot): Array<{ term: string; def: string }> {
  const facts: Array<{ term: string; def: string }> = [
    { term: "Water type", def: DIFFICULTY_LABEL[spot.difficulty] ?? "Unknown" },
    { term: "Region", def: `${spot.region}, California` },
    { term: "Fee", def: spotFeeText(spot) },
    { term: "Conditions", def: spotConditionsSummary(spot) },
  ];
  if (spot.dog_friendly === true) facts.push({ term: "Dogs", def: "Dog friendly" });
  if (spot.dog_friendly === false) facts.push({ term: "Dogs", def: "Dogs not allowed" });
  if (spot.rentals_available) facts.push({ term: "Rentals", def: "Board or kayak rentals available nearby" });
  if (spot.inspection_required === true) facts.push({ term: "Inspection", def: "Watercraft inspection required before launching" });
  if (spot.power_boats === true) facts.push({ term: "Power boats", def: "Shared with power boats, expect wake" });
  if (spot.power_boats === false) facts.push({ term: "Power boats", def: "No power boats" });
  return facts;
}
