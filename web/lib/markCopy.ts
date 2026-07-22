/**
 * Item 83: every user-facing string in the collectables system, in one module.
 *
 * Separate from `marks.ts` so `web/lib/alerts/no-inducement.test.ts` can sweep
 * it as prose alongside the alert copy. That suite has already failed once by
 * listing the surfaces its author remembered instead of the surfaces that
 * exist, so new copy goes here, in a file the suite reads, and not inline in a
 * component.
 *
 * THE CONFIRMATION FUNCTION TAKES NO RATING. Not "ignores it", does not receive
 * it. FTC 16 CFR Part 465 bars rewards conditioned on sentiment in either
 * direction, and the cheapest way to keep that true forever is to make the
 * rating unavailable at the point where the reward is worded. A test submits a
 * 1-star and a 5-star fixture and asserts the output is byte-identical.
 */

import { markById, type MarkId } from "@/lib/marks";

/** Copy for the post-submit moment. `published` is D29's auto-publish path. */
export function confirmation(spotName: string, published: boolean): string {
  // The pending line must keep the moderation promise in full. It is the
  // contributor-facing half of what the Contributor Terms commit to, and
  // reviews-guards.test.ts asserts the exact phrase survives any copy rewrite.
  // Warmth is not a reason to get vaguer about what happens to someone's words.
  return published
    ? `Your rating is live on ${spotName}.`
    : `Your report is in. It goes to a person for review before it appears. Then the next person who opens ${spotName} sees it.`;
}

/**
 * The line that names a mark the submission just earned. Praises the
 * contribution's usefulness to a stranger, never the contributor: "nice work"
 * is both weaker and less true than saying what the report now does.
 */
export function earnedLine(id: MarkId): { title: string; line: string } {
  const title = markById(id).name;
  const line: Record<MarkId, string> = {
    "first-report": "The map knows something it didn't.",
    "own-words": "Sentences are what the next person actually needs.",
    "local-knowledge": "Three spots on the map now carry your read.",
    scouted: "You have looked closely at ten spots.",
    "around-the-bay": "Your reading spans five regions.",
    watching: "Three spots on your watch list.",
  };
  return { title, line: line[id] };
}

export const LOG_TITLE = "Your log";
export const LOG_EMPTY = "Marks land here as you read the map and write things down.";

/** Labels for the three counts. No denominators, no percentages, ever. */
export const LOG_LABELS = {
  reportsLive: (n: number) => `${n} ${n === 1 ? "report" : "reports"} live`,
  spotsKnown: (n: number) => `${n} ${n === 1 ? "spot" : "spots"} known`,
  spotsWatched: (n: number) => `${n} ${n === 1 ? "spot" : "spots"} watched`,
  reportsPending: (n: number) => `${n} in review`,
};

/**
 * Sits above the submit button. The FTC expects a reader to learn that a review
 * followed an incentive, at the place the incentive is acting on them.
 *
 * The wording conditions on OPINION, not on content, and that distinction is
 * load-bearing. The first draft said "never depend on what you say", which was
 * not true: "In your own words" fires only if you wrote sentences, so a mark
 * does depend on what you say, just never on your view of a spot. An
 * over-broad promise in published terms is the same Section 5 problem as an
 * under-disclosed one.
 */
export const DISCLOSURE =
  "We give marks for taking part. They never depend on your opinion of a spot or on how you rate it.";
