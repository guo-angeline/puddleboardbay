/**
 * The single number shown for a spot (owner direction, 2026-07-21).
 *
 * The owner's pre-generated rating is a prior worth OWNER_WEIGHT user reviews,
 * and every published user review is worth one:
 *
 *     (OWNER_WEIGHT * owner + sum of user ratings) / (OWNER_WEIGHT + count)
 *
 * This amends D24, which cleared a display where the crowd average appeared
 * only past 5 reviews and was "never blended" with the owner's rating. The
 * threshold existed so that one review could not read as a verdict on a site
 * carrying drowning-risk exposure; the prior now does that job arithmetically
 * (one 1-star review moves a 4.0 spot to 3.5, not to 1.0), so the blended
 * number shows from the first review.
 *
 * Where there is NO owner rating there is no prior to damp anything, so D24's
 * threshold still applies to those spots unchanged.
 *
 * Pure module: no DOM, no Next imports. The native app imports it too.
 */

/** The owner's rating counts as this many user reviews. */
export const OWNER_WEIGHT = 5;

/**
 * Reviews needed before a spot with NO owner rating shows a number at all.
 * D24's original threshold, still load-bearing for exactly that case.
 */
export const MIN_REVIEWS_WITHOUT_PRIOR = 5;

/** Raw published-review totals for one spot. */
export interface CrowdTotals {
  sum: number;
  count: number;
}

export interface DisplayRating {
  /** The number to show, one decimal. */
  value: number;
  /** Published user reviews behind it. 0 means the owner's rating alone. */
  count: number;
  /** True when the value mixes the owner's rating with user reviews. */
  blended: boolean;
}

/** One decimal, plain arithmetic. Never rounded up to flatter a spot. */
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The number to display for a spot, or null when there is nothing honest to
 * show yet. `crowd` is undefined for spots with no published reviews.
 */
export function displayRating(
  ownerRating: number | null | undefined,
  crowd?: CrowdTotals
): DisplayRating | null {
  const hasOwner = typeof ownerRating === "number" && Number.isFinite(ownerRating);
  const count = crowd && crowd.count > 0 ? crowd.count : 0;

  if (hasOwner) {
    if (count === 0) return { value: round1(ownerRating as number), count: 0, blended: false };
    const weighted = (OWNER_WEIGHT * (ownerRating as number) + crowd!.sum) / (OWNER_WEIGHT + count);
    return { value: round1(weighted), count, blended: true };
  }

  // No prior: D24's threshold is the only thing standing between one review and
  // a number that reads as a verdict, so it stays.
  if (count >= MIN_REVIEWS_WITHOUT_PRIOR) {
    return { value: round1(crowd!.sum / count), count, blended: false };
  }
  return null;
}
