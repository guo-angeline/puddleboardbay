export interface SpotWindow {
  spotId: number;
  spotName: string;
  windowKey: string;
  label: string;
}

/** Dedup key for one (spot, window): shared by the selector and the route's alert_sends rows. */
export function sentKey(spotId: number, windowKey: string): string {
  return `${spotId}:${windowKey}`;
}

/**
 * Watched spots that have a good window and have not already been alerted for
 * that window. Empty if the device is already at its daily cap. Pure.
 */
export function selectAlertSpots(
  watchedSpotIds: number[],
  windowBySpot: Map<number, SpotWindow>,
  sentKeys: Set<string>,
  capReached: boolean
): SpotWindow[] {
  if (capReached) return [];
  const out: SpotWindow[] = [];
  for (const id of watchedSpotIds) {
    const w = windowBySpot.get(id);
    if (!w) continue;
    if (sentKeys.has(sentKey(id, w.windowKey))) continue;
    out.push(w);
  }
  return out;
}

/** One batched push for a device's good spots. No em dashes in copy. */
export function composeAlert(spots: SpotWindow[]): { title: string; body: string; url: string } {
  const first = spots[0];
  const extra = spots.length - 1;
  const tail = extra > 0 ? ` +${extra} more` : "";
  return {
    title: "Good paddling ahead",
    body: `${first.label} looks calm at ${first.spotName}${tail}.`,
    url: `/?spot=${first.spotId}`,
  };
}
