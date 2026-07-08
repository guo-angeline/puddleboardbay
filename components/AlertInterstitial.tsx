"use client";

import { useEffect } from "react";
import type { Spot } from "@/lib/types";
import { track, trackIntent } from "@/lib/analytics";

interface Props {
  spot: Spot;
  windowLabel: string;
  onDismiss: () => void;
}

/**
 * Floating card over the deep-linked spot's drawer, shown whenever the app
 * opened from a push alert. Repeats the calm-window timing the notification
 * already named, plus the spot's put-in notes, so that context survives the
 * click instead of dropping into a bare drawer (ROADMAP item 1).
 *
 * Monitored 100% rollout (D2(a), 2026-07-08): this is no longer an A/B test.
 * The interstitial fires only on push-opens with a tiny watched set, so an arm
 * comparison could never reach significance; instead the card ships to everyone
 * and we watch the guardrails (`spot_sheet_dismissed`, `conditions_loaded`) for
 * regressions. The mount is gated on the alert context in HomeClient, so this
 * component renders the card unconditionally.
 */
export default function AlertInterstitial({ spot, windowLabel, onDismiss }: Props) {
  useEffect(() => {
    trackIntent("alert_interstitial_shown", { spot_id: spot.id });
  }, [spot.id]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
  // Same identity the drawer's action events carry, plus source="alert_interstitial"
  // so the card's directions taps can be told apart from drawer taps (and
  // excluded from the next_good_window primary metric, which they would
  // otherwise contaminate now that the card is always on).
  const spotEventProps = {
    spot_id: spot.id,
    spot_name: spot.water,
    region: spot.region,
    has_fee: spot.has_fee,
  };

  function handleDismiss() {
    trackIntent("alert_interstitial_result", { spot_id: spot.id, outcome: "dismissed" });
    onDismiss();
  }

  function handleDirections() {
    track("spot_action", { ...spotEventProps, action: "directions", source: "alert_interstitial" });
    trackIntent("alert_interstitial_result", { spot_id: spot.id, outcome: "directions" });
    onDismiss();
  }

  return (
    <div className="fixed inset-x-0 top-0 flex justify-center px-4 pt-4" style={{ zIndex: 1300 }}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl px-4 py-3.5" style={{ background: "var(--accent)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-['Libre_Baskerville'] text-white text-base font-bold leading-tight">
              Good window: {windowLabel}
            </p>
            <p className="text-white/80 text-sm mt-0.5">{spot.water}</p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 text-white/70 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
        {spot.notes && (
          <p className="text-white/90 text-sm mt-2 leading-snug line-clamp-3">{spot.notes}</p>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleDirections}
          className="mt-3 flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-semibold bg-white transition-opacity hover:opacity-90"
          style={{ color: "var(--accent)" }}
        >
          Get Directions
        </a>
      </div>
    </div>
  );
}
