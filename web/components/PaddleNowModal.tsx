"use client";

import { useEffect, useRef } from "react";
import type { Spot } from "@/lib/types";
import { trackIntent } from "@/lib/analytics";
import { useReviewAggregates } from "@/lib/useReviewAggregates";
import { useKillSwitch } from "@/lib/experiments";
import { PADDLE_NOW_SEEN_KEY, localDateString, type PaddleNowEntry } from "@/lib/paddleNow";
import { formatShapeHour } from "@/lib/todaysShape";
import SpotCard from "@/components/SpotCard";
import ConditionsBadge from "@/components/ConditionsBadge";

/**
 * Item 137. The first-visit-per-day "Want to paddle now?" modal: up to 3 nearest
 * spots good to launch in the next 60 minutes. This mounts ONLY when there is at
 * least one such spot (HomeClient gates it), so it never opens to say "nothing"
 * (the spam failure mode). The once-per-day flag is written HERE, on genuine
 * render, so a quiet day (no modal) does not burn the daily showing.
 *
 * Dialog a11y follows the item-70 pattern (SignInSheet): role=dialog + aria-modal,
 * focus moved in on open, Escape closes, focus restored to the opener; a Tab trap
 * keeps focus inside. Shell/backdrop reuse the FeedbackModal idiom. The canonical
 * safety caveat co-renders (item 61/8 lawyer precedent for an affirmative "good"
 * claim), guarded by a test.
 */

const FOCUSABLE = 'a[href],button:not([disabled]),[role="button"],input,[tabindex]:not([tabindex="-1"])';

/** "Calm now" when the current hour already reads calm, else "Calm by {h}" from
 * the window's first calm hour. */
function timingNote(entry: PaddleNowEntry): string {
  if (entry.signal.nowPaddleability === "calm") return "Calm now";
  const h = entry.signal.window?.startHour;
  return h != null ? `Calm by ${formatShapeHour(h)}` : "Calm soon";
}

export default function PaddleNowModal({
  spots,
  located,
  onSelectSpot,
  onClose,
}: {
  spots: PaddleNowEntry[];
  located: boolean;
  onSelectSpot: (spot: Spot) => void;
  onClose: () => void;
}) {
  const reviewsOn = useKillSwitch("reviews");
  const aggregates = useReviewAggregates();
  const panelRef = useRef<HTMLDivElement>(null);

  // Fire the impression + write the once-per-day flag EXACTLY on render, once.
  const shownFired = useRef(false);
  useEffect(() => {
    if (shownFired.current) return;
    shownFired.current = true;
    trackIntent("paddle_now_shown", { count: spots.length, located });
    try {
      localStorage.setItem(PADDLE_NOW_SEEN_KEY, localDateString(new Date()));
    } catch {
      /* private mode: the modal still showed; just can't remember it */
    }
  }, [spots.length, located]);

  // Focus in on open, restore on close, Escape closes, Tab trap.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close("escape");
        return;
      }
      if (e.key === "Tab" && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.offsetWidth > 0 || el.offsetHeight > 0
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close(method: "close" | "backdrop" | "escape") {
    trackIntent("paddle_now_dismissed", { method });
    onClose();
  }

  function openSpot(entry: PaddleNowEntry, rank: number) {
    trackIntent("paddle_now_spot_clicked", { spot_id: entry.spot.id, region: entry.spot.region, rank });
    trackIntent("paddle_now_dismissed", { method: "spot_click" });
    onSelectSpot(entry.spot);
  }

  return (
    <div
      className="fixed inset-0 z-[1700] flex items-center justify-center p-4"
      style={{ background: "rgba(11,42,71,0.35)" }}
      onClick={() => close("backdrop")}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paddle-now-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="paddle-now-title" className="font-['Newsreader'] text-xl font-bold text-(--dark) leading-tight">
              Want to paddle now?
            </h2>
            <p className="text-sm text-(--dark) mt-1">
              {located ? "Spots near you are good to go." : "These spots are good to go right now."}
            </p>
            {/* Canonical safety caveat, verbatim, co-rendered with the affirmative
                claim (item 61/8 lawyer gate). Body size + primary ink, not fine
                print: this is the most insistent "go now" surface, so the qualifier
                reads at the weight of the claim it qualifies (item 137 lawyer note). */}
            <p className="text-sm text-(--dark) mt-1.5">
              Guidance only, not a safety guarantee. Conditions shift fast on the water.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => close("close")}
            className="shrink-0 -mt-1.5 -mr-1.5 flex h-11 w-11 items-center justify-center rounded-full text-(--muted) hover:bg-(--fill) hover:text-(--dark) text-xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
          >
            &times;
          </button>
        </div>

        <span className="sr-only" aria-live="polite">
          {spots.length} {spots.length === 1 ? "spot is" : "spots are"} good to paddle in the next hour
        </span>

        <div className="mt-2 -mx-5 border-t border-gray-100">
          {spots.map((entry, i) => (
            <SpotCard
              key={entry.spot.id}
              spot={entry.spot}
              selected={false}
              crowd={reviewsOn ? aggregates[entry.spot.id] : undefined}
              distance={entry.distanceMi}
              onClick={() => openSpot(entry, i + 1)}
              conditionsBadge={
                <div className="flex items-center gap-1.5">
                  <ConditionsBadge state={entry.signal.nowPaddleability} />
                  <span className="text-[11px] text-(--muted)">{timingNote(entry)}</span>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
