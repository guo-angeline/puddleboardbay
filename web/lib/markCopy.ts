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
/**
 * Item 89: the invitation shown on a spot with no published reviews.
 *
 * Every clause here is load-bearing and was required by the legal gate. Read
 * before editing:
 *
 * - NON-PROMISSORY. Reviews are pre-moderated and someone may already be in the
 *   queue, so this states what is true right now and never promises primacy
 *   ("be the first") or publication. The owner asked for "be the first"; it
 *   cannot be said truthfully on a moderated surface.
 * - "Know this spot?" is the eligibility qualifier (16 CFR Part 465: do not
 *   solicit reviews from people with no experience of the thing). It is
 *   deliberately KNOWLEDGE-shaped. Past tense would be acceptable, but anything
 *   with go / paddle / launch / visit / head out would reward getting on the
 *   water, which item 83 forbids outright and no-inducement.test.ts sweeps.
 * - The reward clause carries its own non-conditioning sentence. The incentive
 *   now acts one screen EARLIER than the form, so the disclosure travels with
 *   it. This ADDS to the writer-side DISCLOSURE below, it does not replace it.
 * - The reward is named only when the reader can actually earn it. `first-report`
 *   is a LIFETIME mark, so naming it to someone who already holds it is a plain
 *   false statement repeated across ~176 spots.
 */
export function firstReviewPrompt(
  spotName: string,
  opts: { namesReward: boolean; needsAccount: boolean },
): string {
  const parts = [`No one has written about ${spotName} yet.`, "Know this spot?"];
  if (opts.namesReward) parts.push(rewardClause());
  if (opts.needsAccount) parts.push("You need an account to post.");
  return parts.join(" ");
}

/**
 * Built FROM the mark definition, never typed out, so renaming a mark can never
 * leave this promising a mark by a name that no longer exists.
 */
export function rewardClause(): string {
  return `Writing one earns your ${markById("first-report").name} mark. Marks are for taking part, never for your opinion of a spot or how you rate it.`;
}

export const DISCLOSURE =
  "We give marks for taking part. They never depend on your opinion of a spot or on how you rate it.";
