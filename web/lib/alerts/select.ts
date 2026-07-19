export interface SpotWindow {
  spotId: number;
  spotName: string;
  windowKey: string;
  label: string;
  // Window detail for the email copy (item 27). Optional so the push path,
  // which only uses `label`, needs no change. The email cron populates them.
  startHour?: number; // spot-local hour the calm run starts
  endHour?: number;   // spot-local hour AFTER the calm run ends
  maxWindMph?: number; // peak wind (mph) across the calm run
  windDirection?: string; // NWS wind-FROM direction at the peak-wind hour, for the email launch tip
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

/**
 * One batched push for a device's good spots. No em dashes in copy.
 *
 * `token` is the subscription's durable opaque id (push_subscriptions.token). It
 * rides the deep link as `t` so the app can report the open back to the server
 * (see /api/alerts/opened), which is how long-horizon subscriber retention is
 * measured without depending on client storage that ITP purges. Omitted when
 * absent so older callers/tests keep the same URL.
 */
export function composeAlert(
  spots: SpotWindow[],
  token?: string
): { title: string; body: string; url: string } {
  if (spots.length === 0) throw new Error("composeAlert requires at least one spot");
  const first = spots[0];
  const extra = spots.length - 1;
  // "spots" is not padding: without a verb near it, "Sat 7 to 10am, +2 more"
  // reads as two more hours.
  const tail = extra > 0 ? `, +${extra} more spots` : "";
  // window carries the label through the deep link so the alert interstitial
  // (item 1) can show the same "when" the notification body already named,
  // without a second fetch.
  const tokenParam = token ? `&t=${encodeURIComponent(token)}` : "";
  // Item 34: the title names the FORECAST, not an instruction. That attribution
  // does the "not a guarantee" work for free, in the title, at zero body cost;
  // what it does not cover is the failure-to-warn half, which is the 35-char
  // sentence appended below. Deliberately NOT the full canonical line: it would
  // push the window hours out of the ~120 visible chars, and losing the hours is
  // worse for safety than losing half the caveat. The full line is on the
  // interstitial one tap away, and this alert DOES carry the window param.
  return {
    title: "A good window in the forecast",
    body: `${first.spotName} looks good ${first.label}${tail}. Conditions shift fast on the water.`,
    url: `/?spot=${first.spotId}&from=alert&window=${encodeURIComponent(first.label)}${tokenParam}`,
  };
}
