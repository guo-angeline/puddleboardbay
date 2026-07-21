"use client";

import { useEffect, useState, type Ref } from "react";
import type { Spot } from "@/lib/types";
import { useAccount } from "@/lib/useAccount";
import { trackIntent } from "@/lib/analytics";
import { useGenuineView } from "@/lib/useGenuineView";
import { useKillSwitch } from "@/lib/experiments";
import ReviewForm from "@/components/ReviewForm";

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
        <p className="mt-2 rounded-lg bg-(--fill) px-3 py-2 text-sm text-(--dark)">
          {justSubmitted === "published"
            ? "Thanks. Your rating is live."
            : "Thanks. Your review goes to a person for review before it appears."}
        </p>
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
          }}
          onCancel={onCloseForm}
        />
      )}
    </div>
  );
}
