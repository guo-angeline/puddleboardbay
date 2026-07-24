"use client";

import { useEffect, useRef } from "react";
import type { Spot } from "@/lib/types";
import { trackIntent } from "@/lib/analytics";
import { useReviewAggregates } from "@/lib/useReviewAggregates";
import { useKillSwitch } from "@/lib/experiments";
import { PADDLE_NOW_SEEN_KEY, localDateString } from "@/lib/paddleNow";
import type { GoodTodayEntry } from "@/lib/goodToday";
import { formatShapeHour } from "@/lib/todaysShape";
import SpotCard from "@/components/SpotCard";
import ConditionsBadge from "@/components/ConditionsBadge";

/**
 * Item 137 (redesigned 2026-07-23 on owner feedback). The first-visit-per-day
 * "Want to paddle today?" modal, now in two honest steps:
 *
 *  1. ASK. Since the whole point is spots NEAR YOU, we never guess location from
 *     a statewide anchor (the old version ranked against the middle of CA and
 *     called it "nearest"). The first screen asks, and only a tap requests the
 *     browser location prompt, so it is contextual, not a cold popup on landing.
 *  2. RESULTS. Once located, we rank spots with a calm daytime window left TODAY
 *     (the same evaluateGoodToday bar as item 61), nearest first. If nothing is
 *     calm, we say so; we never invent proximity.
 *
 * Copy is condition-explicit ("the wind and water are calm"), replacing the old
 * vague headline. The canonical safety caveat co-renders verbatim on the claim
 * (item 61/8/34 lawyer precedent), guarded by a test. Dialog a11y follows the
 * item-70 pattern: role=dialog + aria-modal, focus trapped, Escape closes, focus
 * restored to the opener. The once-per-day flag is written on render, so a quiet
 * day (or a denied location) does not burn tomorrow's showing.
 */

const CAVEAT = "Guidance only, not a safety guarantee. Conditions shift fast on the water.";
const FOCUSABLE = 'a[href],button:not([disabled]),[role="button"],input,[tabindex]:not([tabindex="-1"])';

/** "Calm now" when the current hour already reads calm, else "Calm by {h}" from
 * the window's first calm hour. */
function timingNote(entry: GoodTodayEntry): string {
  if (entry.signal.nowPaddleability === "calm") return "Calm now";
  const h = entry.signal.window?.startHour;
  return h != null ? `Calm by ${formatShapeHour(h)}` : "Calm today";
}

export default function PaddleNowModal({
  spots,
  located,
  locating,
  loading,
  failed,
  onFindSpots,
  onSelectSpot,
  onClose,
}: {
  spots: GoodTodayEntry[];
  /** True once we actually know where the user is (grant + fix). Drives ask vs results. */
  located: boolean;
  /** A location request is in flight (button tapped, awaiting the browser). */
  locating: boolean;
  /** The good-today fetch for the located candidate set is still resolving. */
  loading: boolean;
  /** Every candidate's conditions fetch errored (distinct from "none calm"). */
  failed: boolean;
  onFindSpots: () => void;
  onSelectSpot: (spot: Spot) => void;
  onClose: () => void;
}) {
  const reviewsOn = useKillSwitch("reviews");
  const aggregates = useReviewAggregates();
  const panelRef = useRef<HTMLDivElement>(null);

  // Fire the impression + write the once-per-day flag EXACTLY on render, once.
  // `located` at mount tells whether we skipped the ask (returning geolocated user).
  const shownFired = useRef(false);
  useEffect(() => {
    if (shownFired.current) return;
    shownFired.current = true;
    trackIntent("paddle_now_shown", { located });
    try {
      localStorage.setItem(PADDLE_NOW_SEEN_KEY, localDateString(new Date()));
    } catch {
      /* private mode: the modal still showed; just can't remember it */
    }
    // located is captured intentionally at mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function openSpot(entry: GoodTodayEntry, rank: number) {
    trackIntent("paddle_now_spot_clicked", { spot_id: entry.spot.id, region: entry.spot.region, rank });
    trackIntent("paddle_now_dismissed", { method: "spot_click" });
    onSelectSpot(entry.spot);
  }

  // Which step: ask (no location yet) vs results (located).
  const mode: "ask" | "results" = located ? "results" : "ask";
  const resolving = locating || (located && loading);

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
              {mode === "ask" ? "Want to paddle today?" : "Calm spots near you"}
            </h2>
            {mode === "ask" && (
              <p className="text-sm text-(--dark) mt-1">
                We&rsquo;ll find spots near you where the wind and water are calm.
              </p>
            )}
            {/* Canonical safety caveat, verbatim, co-rendered with the "calm"
                claim (item 61/8 lawyer gate). Body weight, not fine print. */}
            <p className="text-sm text-(--dark) mt-1.5">{CAVEAT}</p>
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

        {mode === "ask" ? (
          <button
            type="button"
            onClick={onFindSpots}
            disabled={locating}
            className="mt-4 w-full rounded-xl bg-(--accent) px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2"
          >
            {locating ? "Finding calm spots…" : "Find calm spots near me"}
          </button>
        ) : (
          <>
            <span className="sr-only" aria-live="polite">
              {resolving
                ? "Finding calm spots near you"
                : failed
                  ? "Could not check conditions right now"
                  : spots.length === 0
                    ? "Nothing near you is calm enough to paddle today"
                    : `${spots.length} ${spots.length === 1 ? "spot is" : "spots are"} calm enough to paddle near you today`}
            </span>

            {resolving ? (
              <p className="mt-4 text-sm text-(--muted)">Finding calm spots near you&hellip;</p>
            ) : failed ? (
              <p className="mt-4 text-sm text-(--muted)">
                Couldn&rsquo;t check conditions right now. Try again in a bit.
              </p>
            ) : spots.length === 0 ? (
              <p className="mt-4 text-sm text-(--muted)">
                Nothing near you is calm enough to paddle today. Check back later.
              </p>
            ) : (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
