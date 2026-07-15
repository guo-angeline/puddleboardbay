const VARIABLE_MARKERS = new Set(["variable", "vrb"]);

/**
 * Returns a house-voice sentence naming the upwind compass direction (the
 * direction wind blows FROM, per NWS convention, used verbatim), or null
 * when the wind doesn't qualify for a useful tip.
 */
export function launchDirectionTip(
  windDirection: string | undefined,
  windMph: number | undefined
): string | null {
  if (windMph === undefined || windMph < 5) return null;
  if (!windDirection) return null;
  if (VARIABLE_MARKERS.has(windDirection.toLowerCase())) return null;

  return `Head out toward the ${windDirection} so the wind helps push you back.`;
}
