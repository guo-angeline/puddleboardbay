/**
 * Item 83: the marks in "Your log".
 *
 * Six marks, all DERIVED from counts that already exist. Nothing is stored, so
 * there is no new table and no award timestamp: a mark is simply true whenever
 * its criterion is currently true. That is why existing contributions count
 * retroactively (owner decision, 2026-07-21).
 *
 * Three rules hold this module together, and each is enforced by a test in
 * marks.test.ts rather than by good intentions:
 *
 * 1. NOTHING HERE REWARDS GETTING ON THE WATER. No mark can be earned by
 *    launching, visiting, or being anywhere. `web/lib/alerts/no-inducement.test.ts`
 *    stripped the alerts of every nudge to go paddle, on wrongful-death grounds;
 *    a collection is worse than a push line if it induces, because a push
 *    expires and a collection sits there accumulating. Marks are earned by
 *    writing things down and by looking at the map.
 *
 * 2. NO MARK READS A RATING VALUE. `deriveMarks` never receives one. FTC 16 CFR
 *    Part 465 bars incentives conditioned on sentiment in EITHER direction, so a
 *    "reported a hazard" mark is exactly as non-compliant as a "five stars" one.
 *    The rating is absent from the signature so the violation is unwritable, not
 *    merely unwritten.
 *
 * 3. NO DENOMINATOR. This module exposes counts and earned/unearned, never
 *    "3 of 139" and never a distance to the next threshold. A completion
 *    percentage over launch sites is the Pokemon Go mechanic rebuilt on purpose,
 *    and threshold-proximity displays are the Stack Overflow steering effect
 *    aimed at a safety product.
 *
 * Pure module: no DOM, no Next, no network. The native app can import it.
 */

/** A review as `GET /api/account` returns it. Deliberately no `rating` field. */
export interface MarkReview {
  status: string;
  body: string | null;
}

export type MarkId =
  | "first-report"
  | "own-words"
  | "local-knowledge"
  | "scouted"
  | "around-the-bay"
  | "watching";

export interface MarkDef {
  id: MarkId;
  /** Shown on the mark itself. */
  name: string;
  /**
   * Shown under an unearned mark. States the criterion in full, and never the
   * distance to it ("Three reports written", not "2 more to go"). "Written",
   * not "live": a report counts the moment it is written, even while it waits
   * in the moderation queue, so the wording must not promise publication.
   */
  criterion: string;
}

/**
 * Copy note: every string here describes reading, writing, or looking. None
 * says visit, paddle, launch, go, or been. That is asserted by a test, because
 * this is the file where a well-meaning edit would reintroduce the inducement.
 */
export const MARKS: MarkDef[] = [
  { id: "first-report",    name: "First report",       criterion: "One report written" },
  { id: "own-words",       name: "In your own words",  criterion: "A report written in sentences" },
  { id: "local-knowledge", name: "Local knowledge",    criterion: "Three reports written" },
  { id: "scouted",         name: "Scouted",            criterion: "Ten spots looked at closely" },
  { id: "around-the-bay",  name: "Around the bay",     criterion: "Spots looked at in five regions" },
  { id: "watching",        name: "Watching",           criterion: "Three spots watched" },
];

export const THRESHOLDS = {
  localKnowledge: 3,
  scouted: 10,
  regions: 5,
  watching: 3,
} as const;

export interface LogState {
  /** Published reports. The only count that involves other people at all. */
  reportsLive: number;
  /** Written, waiting on a human. Shown so "0 live" next to an earned mark
   *  does not read as a contradiction: the work exists, our queue is the delay. */
  reportsPending: number;
  /** Spots this device has looked at closely (dwell-qualified). */
  spotsKnown: number;
  /** Spots saved, device and account unioned. */
  spotsWatched: number;
  /** Distinct regions among the explored spots. */
  regionsKnown: number;
  earned: MarkId[];
}

const isPublished = (r: MarkReview) => r.status === "published";
const hasText = (r: MarkReview) => typeof r.body === "string" && r.body.trim() !== "";

/**
 * What a mark counts: everything the contributor actually wrote, whether or not
 * a human has got to it yet. Rejected and removed rows do not count.
 *
 * Marks deliberately do NOT wait for publication, and this was found by
 * verifying the real flow rather than by reasoning about it. Text goes to the
 * moderation queue (D29) while a bare star publishes instantly, so keying marks
 * to `published` gave the low-effort path instant recognition and made the
 * high-effort path wait on our queue. "In your own words", the mark that exists
 * precisely to value sentences over stars, could never fire at the moment
 * someone wrote them. The queue is our latency, not the contributor's failure.
 *
 * `reportsLive` below still counts only published rows, because that label
 * claims something is visible to other people and it has to stay true.
 */
const isContribution = (r: MarkReview) => r.status === "published" || r.status === "pending";

/**
 * The whole log, from the three sources the app already has.
 *
 * `reviews` comes from `GET /api/account` (server, service-role-written, so it
 * cannot be self-granted). `exploredRegions` and `savedIds` are device-local and
 * therefore forgeable by anyone willing to edit their own localStorage, which is
 * acceptable precisely because marks are private and confer nothing.
 */
export function deriveLog(
  reviews: MarkReview[],
  exploredRegions: string[],
  savedIds: number[],
  /**
   * Saves the ACCOUNT knows about, which can exceed this device's list when the
   * user saved something on another device. Taking the larger of the two means
   * signing in on a fresh phone never appears to lose marks.
   */
  accountSavedCount = 0
): LogState {
  const reportsLive = reviews.filter(isPublished).length;
  const reportsPending = reviews.filter((r) => r.status === "pending").length;
  const contributions = reviews.filter(isContribution);
  const spotsKnown = exploredRegions.length;
  const regionsKnown = new Set(exploredRegions).size;
  const spotsWatched = Math.max(new Set(savedIds).size, accountSavedCount);

  const earned: MarkId[] = [];
  if (contributions.length >= 1) earned.push("first-report");
  if (contributions.some(hasText)) earned.push("own-words");
  if (contributions.length >= THRESHOLDS.localKnowledge) earned.push("local-knowledge");
  if (spotsKnown >= THRESHOLDS.scouted) earned.push("scouted");
  if (regionsKnown >= THRESHOLDS.regions) earned.push("around-the-bay");
  if (spotsWatched >= THRESHOLDS.watching) earned.push("watching");

  return { reportsLive, reportsPending, spotsKnown, spotsWatched, regionsKnown, earned };
}

/**
 * The marks earned by submitting THIS review, given the log before it. Returns
 * at most one, the last in MARKS order, so the moment celebrates one thing
 * rather than dumping a pile.
 */
export function newlyEarned(before: LogState, after: LogState): MarkId | null {
  const had = new Set(before.earned);
  const fresh = after.earned.filter((m) => !had.has(m));
  return fresh.length > 0 ? fresh[fresh.length - 1] : null;
}

export const markById = (id: MarkId): MarkDef => MARKS.find((m) => m.id === id)!;
