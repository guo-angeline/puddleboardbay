"use client";

import { useEffect } from "react";
import type { Spot } from "@/lib/types";
import { track, trackIntent } from "@/lib/analytics";
import { useExperiment } from "@/lib/experiments";

interface Props {
  spot: Spot;
  windowLabel: string;
  onDismiss: () => void;
}

/**
 * Floating card over the deep-linked spot's drawer, shown only when the app
 * opened from a push alert. Repeats the calm-window timing the notification
 * already named, plus the spot's put-in notes, so that context survives the
 * click instead of dropping into a bare drawer (ROADMAP item 1).
 */
export default function AlertInterstitial({ spot, windowLabel, onDismiss }: Props) {
  const { variant, ready, logExposure } = useExperiment("alert_interstitial");
  const isTreatment = ready && variant === "treatment";

  // Exposure is the trigger, not the render. This component mounts for BOTH
  // arms whenever the app opened from an alert on this spot (HomeClient gates
  // the mount on the alert context, not the variant), so exposure is logged
  // here for control and treatment alike. Logging only in the treatment branch
  // is what broke the first cut: control had zero exposed users, leaving no
  // counterfactual cohort to measure lift against.
  useEffect(() => {
    if (!ready) return;
    logExposure();
  }, [ready, logExposure]);

  useEffect(() => {
    if (!isTreatment) return;
    trackIntent("alert_interstitial_shown", { spot_id: spot.id });
  }, [isTreatment, spot.id]);

  if (!isTreatment) return null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
  // Same identity the drawer's action events carry, so the card's directions
  // tap lands in the shared spot_action series and the experiment can compare
  // it against control's drawer button.
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
    // Fire the shared directions metric (the arms' comparable success event)
    // plus the within-treatment result split for card-level diagnostics.
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
