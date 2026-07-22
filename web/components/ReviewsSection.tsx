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
import { confirmation } from "@/lib/markCopy";
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
  const { enabled: authEnabled } = useAccount();
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

  if (!authEnabled || !reviewsOn) return null;

  // Nothing to show until a spot actually has one. An empty review block on
  // all 140 spots advertises a feature the site cannot deliver yet. The
  // section appears the moment the first one publishes, and while the form is
  // open (the form renders in here; the trigger sits in the action row below).
  const hasReviews = reviews !== null && reviews.length > 0;
  if (!hasReviews && !formOpen && !justSubmitted) return null;

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
        <h3 className="font-['Newsreader'] text-base font-bold text-(--dark)">
          Paddler reviews
          <span className="ml-1.5 font-sans text-sm font-normal text-(--muted)">
            {reviews!.length}
          </span>
        </h3>
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
