"use client";

import { useEffect, useRef, useState } from "react";
import type { Spot } from "@/lib/types";
import type { GoodTodayEntry } from "@/lib/goodToday";
import type { SpotViewedSource } from "@/lib/analytics";
import { trackSystem, trackIntent } from "@/lib/analytics";
import { useKillSwitch } from "@/lib/experiments";
import ConditionsBadge from "@/components/ConditionsBadge";

/**
 * Item 120. The mobile map-tab cold open (~82% of traffic) otherwise lands on a
 * map of unlabeled dots with no copy. This slim strip pins to the top of the map
 * panel and answers "what is this" instantly (a static value prop, never blocked
 * on a fetch), then swaps in place to "what's good today" once item 61's
 * `goodTodaySpots` resolves, tappable into that spot.
 *
 * Mobile only (`md:hidden`); HomeClient renders it only on the map tab with a
 * non-empty result set. Session-scoped dismiss (good-today is a daily-changing
 * answer, so a permanent kill would retire the teaser after one early tap).
 */

const DISMISS_KEY = "ptw-map-banner-dismissed";
const VALUE_PROP = "Paddleboard & kayak spots across California";

export default function MapColdOpenBanner({
  topSpot,
  loading,
  located,
  onSelect,
}: {
  /** The top good-today spot, or null (still loading / none calm / switch off). */
  topSpot: GoodTodayEntry | null;
  loading: boolean;
  located: boolean;
  onSelect: (spot: Spot, source?: SpotViewedSource) => void;
}) {
  const on = useKillSwitch("map-cold-open-banner");
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const variant = topSpot ? "good_today" : "value_prop";

  // SYSTEM availability event, once, when the good-today resolution settles
  // (loading -> false). Reports the final variant, so a report can read what
  // fraction of mobile cold opens could answer "what's good today".
  const loadedFired = useRef(false);
  useEffect(() => {
    if (!on || dismissed || loading || loadedFired.current) return;
    loadedFired.current = true;
    trackSystem("map_banner_loaded", {
      variant,
      spot_id: topSpot?.spot.id,
      located,
    });
  }, [on, dismissed, loading, variant, topSpot, located]);

  if (!on || dismissed) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: fall through, just hide for the render */
    }
    setDismissed(true);
    trackIntent("map_banner_dismissed", {});
  }

  const good = topSpot; // narrowed below
  const tappable = !!good;

  function open() {
    if (!good) return;
    trackIntent("map_banner_clicked", {
      spot_id: good.spot.id,
      region: good.spot.region,
      variant: "good_today",
    });
    onSelect(good.spot, "map_banner");
  }

  return (
    <div className="md:hidden absolute inset-x-0 top-0 z-[1050] bg-white border-b border-(--border) shadow-sm">
      <div className="flex items-center">
        <div
          className={`flex-1 min-w-0 px-4 py-2.5 ${tappable ? "cursor-pointer" : ""}`}
          role={tappable ? "button" : undefined}
          tabIndex={tappable ? 0 : undefined}
          onClick={tappable ? open : undefined}
          onKeyDown={
            tappable
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }
              : undefined
          }
        >
          <p className="text-sm text-(--dark) truncate" aria-live="polite">
            {good ? (
              <>
                <span className="font-medium">Good today: </span>
                <span className="font-semibold">{good.spot.water || good.spot.city}</span>{" "}
                <ConditionsBadge state={good.signal.nowPaddleability} />{" "}
                <span className="text-(--accent) font-semibold">&rarr;</span>
              </>
            ) : (
              <span className="font-medium">{VALUE_PROP}</span>
            )}
          </p>
          {/* Required safety caveat, co-rendered with the affirmative "good today"
              claim (item 61/8 lawyer precedent), verbatim. The value-prop variant
              makes no conditions claim, so it needs none. */}
          {good && (
            // Legible token, not 10px gray-400: this caveat is the load-bearing
            // disclaimer for the good-today claim on a surface with no other
            // disclaimer, so it must clear AA (--muted is the AA-darkened token,
            // item 62). The item-61 list + conditions-panel foot instances still
            // use the old 10px gray-400; sweeping those to match is a follow-up.
            <p className="text-[11px] text-(--muted) leading-snug mt-0.5">
              Guidance only, not a safety guarantee. Conditions shift fast on the water.
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-lg leading-none text-(--muted) hover:text-(--dark) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
