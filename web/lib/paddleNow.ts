/**
 * Item 137. Shared constants for the first-visit-per-day "Want to paddle today?"
 * modal (see components/PaddleNowModal.tsx). The eligibility/ranking now reuses
 * item 61's evaluateGoodToday + useGoodTodaySpots directly (the modal is a
 * location-gated presentation of "calm today", not a separate calm definition),
 * so only the once-per-day key and the pure local-date helper live here.
 */

/** localStorage key for the once-per-user-per-day gate. Value is the local date
 * string, so the modal shows at most once per calendar day per device. */
export const PADDLE_NOW_SEEN_KEY = "ptw-paddle-now-seen";

/** Local calendar date (YYYY-MM-DD) of a Date, in the viewer's timezone. Pure
 * (takes the Date in), so it never runs Date.now() during render. */
export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
