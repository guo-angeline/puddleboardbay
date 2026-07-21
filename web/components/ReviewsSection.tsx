"use client";

import { useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import { useAccount } from "@/lib/useAccount";
import { trackIntent } from "@/lib/analytics";
import { useGenuineView } from "@/lib/useGenuineView";
import { useKillSwitch } from "@/lib/experiments";
import ReviewForm from "@/components/ReviewForm";
import SignInSheet from "@/components/SignInSheet";

export interface PublishedReview {
  id: string;
  rating: number;
  body: string | null;
  display_name: string | null;
  created_at: string;
}

// Item 43: published crowd reviews for one spot, plus the submit path.
// The spot pages are statically generated, so reviews load client-side on open,
// the same way ConditionsPanel loads conditions.
export default function ReviewsSection({ spot }: { spot: Spot }) {
  const { user, enabled: authEnabled } = useAccount();
  // Reversibility, per the "no A/B until DAU > 100" directive: ship at 100%
  // behind a kill switch, default ON. `authEnabled` is only a config check, so
  // without this there is no way to pull reviews without a redeploy, and this
  // is the surface most likely to need pulling in a hurry (UGC).
  const reviewsOn = useKillSwitch("reviews");
  const [reviews, setReviews] = useState<PublishedReview[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

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
  }, [spot.id]);

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

  function onWriteClick() {
    trackIntent("review_form_opened", { spot_id: spot.id, region: spot.region });
    if (user) setFormOpen(true);
    else setSignInOpen(true); // signed out is a sign-in prompt, not a dead end
  }

  if (!authEnabled || !reviewsOn) return null;

  return (
    <div ref={viewRef} className="mt-5 border-t border-(--border) pt-4">
      <h3 className="font-['Newsreader'] text-base font-bold text-(--dark)">
        Paddler reviews
        {reviews && reviews.length > 0 && (
          <span className="ml-1.5 font-sans text-sm font-normal text-(--muted)">
            {reviews.length}
          </span>
        )}
      </h3>

      {justSubmitted && (
        <p className="mt-2 rounded-lg bg-(--fill) px-3 py-2 text-sm text-(--dark)">
          Thanks. Your review goes to a person for review before it appears.
        </p>
      )}

      {reviews === null ? (
        <p className="mt-2 text-sm text-(--muted)">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-2 text-sm text-(--muted)">No reviews yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {reviews.map((r) => (
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

      {!formOpen && !justSubmitted && (
        <button
          type="button"
          onClick={onWriteClick}
          className="mt-3 rounded-lg border border-(--border) px-3 py-2 text-sm font-medium text-(--dark) hover:bg-(--fill) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
        >
          Write a review
        </button>
      )}

      {formOpen && (
        <ReviewForm
          spot={spot}
          onSubmitted={() => {
            setFormOpen(false);
            setJustSubmitted(true);
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {signInOpen && <SignInSheet onClose={() => setSignInOpen(false)} />}
    </div>
  );
}
