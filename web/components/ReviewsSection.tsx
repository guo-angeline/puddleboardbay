"use client";

import { useEffect, useState, type Ref } from "react";
import type { Spot } from "@/lib/types";
import { useAccount } from "@/lib/useAccount";
import { trackIntent } from "@/lib/analytics";
import { useGenuineView } from "@/lib/useGenuineView";
import { useKillSwitch } from "@/lib/experiments";
import ReviewForm from "@/components/ReviewForm";
import MarkMoment from "@/components/MarkMoment";
import { deriveLog, newlyEarned, type LogState, type MarkId } from "@/lib/marks";
import { confirmation, firstReviewPrompt } from "@/lib/markCopy";
import { exploredRegions } from "@/lib/exploredSpots";

/** The device's saved spots. Same localStorage key HomeClient owns. */
function readSavedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem("ptw-favorites") || "[]");
    return Array.isArray(raw) ? raw.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

export interface PublishedReview {
  id: string;
  rating: number;
  body: string | null;
  display_name: string | null;
  created_at: string;
}

interface Props {
  spot: Spot;
  /** Owned by SpotDrawer: the "Review" trigger sits in the action row. */
  formOpen: boolean;
  onCloseForm: () => void;
  ref?: Ref<HTMLDivElement>;
}

// Item 43: published crowd reviews for one spot, plus the submit form.
// The spot pages are statically generated, so reviews load client-side on open,
// the same way ConditionsPanel loads conditions.
export default function ReviewsSection({ spot, formOpen, onCloseForm, ref }: Props) {
  const { enabled: authEnabled, user } = useAccount();
  // Reversibility, per the "no A/B until DAU > 100" directive: ship at 100%
  // behind a kill switch, default ON. `authEnabled` is only a config check, so
  // without this there is no way to pull reviews without a redeploy, and this
  // is the surface most likely to need pulling in a hurry (UGC).
  const reviewsOn = useKillSwitch("reviews");
  const [reviews, setReviews] = useState<PublishedReview[] | null>(null);
  const [reload, setReload] = useState(0);
  // null = nothing submitted this session; otherwise the server-reported status,
  // so the confirmation tells the truth for both paths (item 79).
  const [justSubmitted, setJustSubmitted] = useState<"pending" | "published" | null>(null);
  // Item 83: the mark this submission earned, if any.
  //
  // Compared BEFORE against AFTER rather than against a remembered set. The
  // first version kept a device-local "already seen" list so retroactive marks
  // would not throw a party for old work, but that silenced the one moment that
  // matters most: a brand-new contributor's FIRST report, on a device that had
  // never recorded anything. A before/after diff is exact for everyone, with no
  // history to keep and nothing to get stale.
  const [earnedMark, setEarnedMark] = useState<MarkId | null>(null);
  const [logBefore, setLogBefore] = useState<LogState | null>(null);
  const collectablesOn = useKillSwitch("collectables");

  async function fetchLog(): Promise<LogState | null> {
    try {
      const res = await fetch("/api/account");
      if (!res.ok) return null;
      const summary: {
        reviews?: { status: string; body: string | null }[];
        savedCount?: number;
      } = await res.json();
      return deriveLog(
        summary.reviews ?? [],
        exploredRegions(),
        readSavedIds(),
        summary.savedCount ?? 0
      );
    } catch {
      return null;
    }
  }

  // Snapshot the log while the form is open, so the diff after submitting is
  // exactly what THIS report earned.
  useEffect(() => {
    if (!formOpen || !collectablesOn) return;
    let active = true;
    void fetchLog().then((log) => {
      if (active && log) setLogBefore(log);
    });
    return () => {
      active = false;
    };
  }, [formOpen, collectablesOn]);

  // Item 89 / finding A3: `first-report` is a LIFETIME mark ("one report
  // written", anywhere), not a per-spot one. So the invitation may only name it
  // to a reader who can actually still earn it. A signed-out reader always can.
  // For a signed-in one we have to look, and until we know, we say nothing about
  // a reward: `null` means "not established", and the copy omits the clause.
  // Naming a reward someone cannot receive is a false statement, and this
  // surface repeats it across 176 spots.
  const [holdsFirstReport, setHoldsFirstReport] = useState<boolean | null>(null);
  useEffect(() => {
    if (!collectablesOn || !user) return;
    let active = true;
    void fetchLog().then((log) => {
      if (active && log) setHoldsFirstReport(log.earned.includes("first-report"));
    });
    return () => {
      active = false;
    };
  }, [user, collectablesOn]);

  async function resolveEarnedMark() {
    if (!collectablesOn) return;
    const after = await fetchLog();
    if (!after) return; // a failed lookup costs a mark, never the submission
    const fresh = newlyEarned(logBefore ?? { ...after, earned: [] }, after);
    if (fresh) {
      setEarnedMark(fresh);
      trackIntent("mark_shown", { mark: fresh, trigger: "submit", reports: after.reportsLive });
    }
  }

  // No state reset here: SpotDrawer mounts this with key={spot.id}, so React
  // gives us a fresh component per spot. Resetting in the effect body instead
  // would be a setState-in-effect (lint error) and a wasted extra render.
  useEffect(() => {
    let active = true;
    fetch(`/api/reviews?spot_id=${spot.id}`)
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((j: { reviews?: PublishedReview[] }) => {
        if (active) setReviews(j.reviews ?? []);
      })
      .catch(() => {
        if (active) setReviews([]);
      });
    return () => {
      active = false;
    };
  }, [spot.id, reload]);

  const hasReviews = reviews !== null && reviews.length > 0;
  // `reviews === null` is "not loaded yet": render nothing rather than flash an
  // invitation at someone whose reviews are one tick from arriving.
  const showPrompt = reviews !== null && !hasReviews && !formOpen && !justSubmitted;

  // INTENT, dwell-gated: "did someone actually read the reviews", never a fetch
  // settle. Fires only for a spot that has something to read.
  const viewRef = useGenuineView({
    key: spot.id,
    enabled: Boolean(reviews && reviews.length > 0),
    onView: () =>
      trackIntent("reviews_viewed", {
        spot_id: spot.id,
        region: spot.region,
        count: reviews?.length ?? 0,
      }),
  });

  // INTENT, dwell-gated per the house rule: the invitation's IMPRESSION, so the
  // goal metric (reviews submitted per prompt actually seen) has a real
  // denominator. Never fires on mount, which on this surface would be a
  // per-spot-open counter dressed up as intent.
  const promptRef = useGenuineView({
    key: spot.id,
    enabled: showPrompt,
    onView: () =>
      trackIntent("first_review_prompt_shown", {
        spot_id: spot.id,
        region: spot.region,
        named_reward: showPrompt && holdsFirstReport === false,
      }),
  });

  if (!authEnabled || !reviewsOn) return null;

  // Item 89 REVERSES the rule that used to live here, deliberately. The old
  // reasoning was: "an empty review block on all 140 spots advertises a feature
  // the site cannot deliver yet", so the section stayed hidden until a spot had
  // its first published review. That was right while there was nothing to ask
  // for. The owner has now asked for the opposite: invite the first review on a
  // spot that has none.
  //
  // The blast radius is the whole point to keep in mind. 176 of 177 spots have
  // zero published reviews, so this is the highest-traffic surface in the app.
  // It must stay QUIET: one line of prose, no second call to action. The filled
  // "Write a review" button already sits in the action row below (SpotDrawer),
  // and two competing asks on one sheet is the failure mode to avoid.
  //
  // `reviews === null` still means "not loaded yet", and we render nothing then
  // rather than flashing an invitation at someone whose reviews are one tick
  // from arriving.
  if (!hasReviews && !formOpen && !justSubmitted && !showPrompt) return null;

  return (
    <div
      // Two refs on one node: the dwell observer (a callback ref) and the
      // drawer's scroll target.
      ref={(node) => {
        viewRef(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className="mt-5 mb-5 border-t border-(--border) pt-4"
    >
      {hasReviews && (
        <h3 className="font-['Newsreader'] text-base font-bold text-(--dark)">Paddler reviews</h3>
      )}

      {showPrompt && (
        /* Item 89: the invitation. ONE line of prose and no button. The filled
           "Write a review" control already sits in the action row below, so a
           second call to action here would give the sheet two competing asks.
           This tells the reader the spot is empty; the existing button is how
           they act on it.

           Every clause is assembled in lib/markCopy.ts, never inline, so
           no-inducement.test.ts sweeps it as prose. See that file for why each
           part is worded the way it is. */
        <p ref={promptRef} className="text-sm text-(--dark)">
          {firstReviewPrompt(spot.water, {
            // A3: only name a reward the reader can still earn. A signed-out
            // reader always can, so they see it. A signed-in one only if the
            // lookup came back saying they do NOT already hold the mark;
            // `null` means "not established yet" and omits the clause rather
            // than guessing. Silence is never a false statement.
            namesReward: collectablesOn && (!user || holdsFirstReport === false),
            // A6: do not spring the sign-in wall on someone after naming a
            // reward. Signed-in readers do not need telling.
            needsAccount: !user,
          })}
        </p>
      )}

      {justSubmitted && (
        <MarkMoment
          message={confirmation(spot.water, justSubmitted === "published")}
          mark={earnedMark}
        />
      )}

      {hasReviews && (
        <ul className="mt-2 flex flex-col gap-3">
          {reviews!.map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-(--accent)">
                  {"★".repeat(r.rating)}
                  <span className="text-(--border)">{"★".repeat(5 - r.rating)}</span>
                </span>
                <span className="sr-only">{r.rating} out of 5</span>
                <span className="text-xs text-(--muted)">{r.display_name ?? "A paddler"}</span>
              </div>
              {r.body && <p className="mt-1 leading-relaxed text-(--dark)">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}

      {/* Item 85 (owner-directed): the marks sentence is gone. The re-gate
          cleared that removal (marks are private, valueless, and never
          conditioned on what a review says, so the material connection fails
          the Endorsement Guides materiality test) on ONE condition: THE LINK
          STAYS. This is a reader's only route to the Contributor Terms; the
          review form's link is writer-only, behind the form.
          NOT gated on the collectables switch, because those terms also
          explain how the score is computed (s6.4): killing marks must not cut
          the path to the score's explanation. Sits under the list, so a bare
          link reads as a footnote rather than as a label on the first review. */}
      {/* Item 89 / finding A1: this used to be gated on `hasReviews`, which
          meant the one reader-facing route to the Contributor Terms would have
          been absent from the ~176 zero-review spots where the invitation now
          renders. Item 85's removal of the in-line marks disclosure was cleared
          ON THE CONDITION that this link survives on the reviews surface, so
          gating it on the half of the surface that did not exist yet would have
          quietly voided that verdict. It now renders whenever the section does. */}
      {(hasReviews || showPrompt) && (
        <p className="mt-2 text-xs text-(--muted)">
          {/* Item 87: `inline-block py-1` is a target-size fix, not spacing.
              WCAG 2.2 SC 2.5.8 wants a 24x24 CSS px target. This anchor used to
              sit inside a sentence, where the "inline" exception covered it,
              and item 85 deleted that sentence, leaving a ~16px tall hit area
              as the only content of its own paragraph. The exception no longer
              applies, so the box has to earn the height itself. */}
          <a
            href="/contributor-terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block py-1 underline"
          >
            Contributor Terms
          </a>
        </p>
      )}

      {formOpen && (
        <ReviewForm
          spot={spot}
          onSubmitted={(status) => {
            setJustSubmitted(status);
            onCloseForm();
            // An auto-published rating should appear without a page reload.
            if (status === "published") setReload((n) => n + 1);
            void resolveEarnedMark();
          }}
          onCancel={onCloseForm}
        />
      )}
    </div>
  );
}
