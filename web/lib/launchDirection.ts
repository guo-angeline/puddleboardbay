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
 *
 * ITEM 34 (2026-07-16). This used to read "Head out toward the {words} so the
 * wind helps push you back." Two things were wrong with it, and the legal gate
 * caught both after item 34's first pass had already declared the inducement
 * dead:
 *
 *  1. It is an imperative. It shipped on the alert email and the interstitial,
 *     rendering ONE LINE ABOVE "Guidance only, not a safety guarantee", which is
 *     the worst possible juxtaposition: a disclaimer directly under an
 *     instruction reads as knowing the advice was risky and papering it. It also
 *     broke this repo's own stated rule (templates.ts: "tips teach skill, they
 *     never instruct action, no 'head out now'"), which item 41's tips were held
 *     to and this one was not, in the same email.
 *  2. "so the wind helps push you back" is an affirmative representation that
 *     the paddler will be able to RETURN. Failing to get back is the precise
 *     failure mode in offshore-wind SUP incidents. It is derived from one peak
 *     wind number and knows nothing about tide, current, geography, or skill.
 *     That is more reliance-inducing than the hype copy item 34 removed.
 *
 * So it now reports the wind as a fact and states the geometry, leaving the
 * decision to the paddler. No verb aimed at the reader, no promise about the
 * way home. The useful insight (start upwind, finish downwind) survives.
 */
export function launchDirectionTip(
  windDirection: string | undefined,
  windMph: number | undefined
): string | null {
  if (windMph === undefined || windMph < 5) return null;
  if (!windDirection) return null;
  if (VARIABLE_MARKERS.has(windDirection.toLowerCase())) return null;

  const words = COMPASS_WORDS[windDirection.toUpperCase()] ?? windDirection;
  return `Wind is from the ${words}. An upwind start leaves the downwind leg for the way back.`;
}
