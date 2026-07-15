const VARIABLE_MARKERS = new Set(["variable", "vrb"]);

// NWS reports wind direction as a 16-point compass abbreviation. Expand it to
// full words so the tip reads friendly for non-sailors ("west-northwest", not
// "WNW"). Keyed by upper-case abbreviation; falls back to the raw value if a
// direction ever arrives outside this set.
const COMPASS_WORDS: Record<string, string> = {
  N: "north",
  NNE: "north-northeast",
  NE: "northeast",
  ENE: "east-northeast",
  E: "east",
  ESE: "east-southeast",
  SE: "southeast",
  SSE: "south-southeast",
  S: "south",
  SSW: "south-southwest",
  SW: "southwest",
  WSW: "west-southwest",
  W: "west",
  WNW: "west-northwest",
  NW: "northwest",
  NNW: "north-northwest",
};

/**
 * Returns a house-voice sentence naming the upwind compass direction (the
 * direction wind blows FROM, per NWS convention, expanded to full words), or
 * null when the wind doesn't qualify for a useful tip.
 */
export function launchDirectionTip(
  windDirection: string | undefined,
  windMph: number | undefined
): string | null {
  if (windMph === undefined || windMph < 5) return null;
  if (!windDirection) return null;
  if (VARIABLE_MARKERS.has(windDirection.toLowerCase())) return null;

  const words = COMPASS_WORDS[windDirection.toUpperCase()] ?? windDirection;
  return `Head out toward the ${words} so the wind helps push you back.`;
}
