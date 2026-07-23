"use client";

import { useRef, useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import { trackIntent, type SpotViewedSource } from "@/lib/analytics";
import { readStashedSubscription } from "@/lib/push";
import { isEmailConfirmed } from "@/lib/email/subscriptionState";
import { useGenuineView } from "@/lib/useGenuineView";
import SpotCard from "./SpotCard";
import { useReviewAggregates } from "@/lib/useReviewAggregates";
import { useKillSwitch } from "@/lib/experiments";
import { rankSavedSpotsByConditions, type SavedConditionState } from "@/lib/savedConditions";
import type { GoodTodayEntry } from "@/lib/goodToday";
import ConditionsBadge from "./ConditionsBadge";

interface Props {
  spots: Spot[];
  selected: Spot | null;
  onSelect: (spot: Spot, source?: SpotViewedSource) => void;
  onClearFilters: () => void;
  distanceMap?: Record<number, number>;
  savedSpots?: Spot[];
  favorites?: Set<number>;
  onToggleFavorite?: (id: number) => void;
  condBySpot?: Record<number, SavedConditionState>;
  /** Cold-open "Recently checked" spots (item 26), already deduped against saved. */
  recentSpots?: Spot[];
  recentCondBySpot?: Record<number, SavedConditionState>;
  /** Cold-open "Good to paddle today" ranked surface (item 61). */
  goodTodayEnabled?: boolean;
  goodTodaySpots?: GoodTodayEntry[];
  goodTodayLoading?: boolean;
  goodTodayFailed?: boolean;
  /** Candidate set was nearest-to-user vs anchored to the map default. */
  goodTodayLocated?: boolean;
  /** Whether there was any candidate to check (all nearest already saved/recent
   * leaves nothing to check, so the section hides rather than claiming nothing
   * is calm). */
  goodTodayHasCandidates?: boolean;
  emptyState?: { title: string; clearLabel: string };
}

export function getSpotListEmptyState(
  spotCount: number,
  savedCount: number,
  recentCount: number,
): "full" | "inline" | null {
  if (spotCount > 0) return null;
  return savedCount > 0 || recentCount > 0 ? "inline" : "full";
}

export default function SpotList({
  spots, selected, onSelect, onClearFilters, distanceMap,
  savedSpots = [], favorites = new Set(), onToggleFavorite, condBySpot = {},
  recentSpots = [], recentCondBySpot = {},
  goodTodayEnabled = false, goodTodaySpots = [], goodTodayLoading = false,
  goodTodayFailed = false, goodTodayLocated = false, goodTodayHasCandidates = false,
  emptyState,
}: Props) {
  // Item 43: one aggregate fetch for the whole list, passed down per card.
  const aggregates = useReviewAggregates();
  // Item 86: the `reviews` kill switch has to reach the LIST too, not just the
  // sheet. It exists to pull contributor content in a hurry, and until now
  // flipping it off left every card still showing a number blended from
  // published contributor ratings, labelled as our take, with the reviews
  // themselves hidden and no route to the terms explaining the blend. In the
  // incident the switch is for, the owner would have believed contributor
  // input was pulled and been wrong. Must stay identical to SpotDrawer's gate.
  const reviewsOn = useKillSwitch("reviews");
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  // Item 15: an always-available way back into alerts for users with saved spots.
  // Shown in the saved-spots header when not yet subscribed; dispatches the event
  // InstallPrompt listens for (which bypasses the dismiss snooze). Reads the
  // subscription in an effect (localStorage) to avoid an SSR hydration mismatch,
  // and hides once alerts are enabled.
  const [alertsOn, setAlertsOn] = useState(true);
  // item 18 recovery floor: iOS gives the installed PWA a storage partition
  // separate from Safari, so favorites saved in Safari are gone on first launch
  // (repro confirmed, D7). We can't rehydrate them (the anon id is partitioned
  // too), so the empty-favorites state on an INSTALLED app shows an explicit
  // re-save nudge instead of the generic first-run one, which makes the item-14
  // alert re-offer reachable once they re-save.
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    const sync = () => setAlertsOn(!!readStashedSubscription() || isEmailConfirmed());
    sync();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
        window.matchMedia("(display-mode: standalone)").matches
    );
    window.addEventListener("ptw:alertsenabled", sync);
    return () => window.removeEventListener("ptw:alertsenabled", sync);
  }, []);

  // INTENT: the "Your saved spots" section was genuinely scrolled into view, the
  // real "I came back to check my spots" signal. Re-arms when the saved set
  // changes. Distinct from `saved_conditions_loaded` (data merely resolved).
  const savedIdsKey = savedSpots.map((s) => s.id).sort((a, b) => a - b).join(",");
  const savedSectionRef = useGenuineView({
    key: savedIdsKey,
    enabled: savedSpots.length > 0,
    onView: () => {
      const calm = savedSpots.filter((s) => condBySpot[s.id] === "calm").length;
      trackIntent("saved_conditions_viewed", { count: savedSpots.length, calm_count: calm });
    },
  });

  // INTENT: the "Recently checked" strip (item 26) was genuinely scrolled into
  // view. The cold-open return signal for anonymous users with view history.
  const recentIdSet = new Set(recentSpots.map((s) => s.id));
  const recentKey = recentSpots.map((s) => s.id).join(",");
  const recentSectionRef = useGenuineView({
    key: recentKey,
    enabled: recentSpots.length > 0,
    onView: () => {
      const calm = recentSpots.filter((s) => recentCondBySpot[s.id] === "calm").length;
      trackIntent("recent_spots_shown", { count: recentSpots.length, calm_count: calm });
    },
  });

  // INTENT: the "Good to paddle today" section (item 61) was genuinely scrolled
  // into view. Fires once resolved (not while loading), in every resolved state
  // including "none calm" (count 0), so the impression denominator is honest.
  const goodTodayIds = goodTodaySpots.map((e) => e.spot.id);
  const goodTodayIdSet = new Set(goodTodayIds);
  const goodTodayKey = `${goodTodayIds.join(",")}|${goodTodayLocated}`;
  const goodTodaySectionRef = useGenuineView({
    key: goodTodayKey,
    enabled: goodTodayEnabled && !goodTodayLoading,
    onView: () => {
      trackIntent("good_today_shown", { count: goodTodaySpots.length, located: goodTodayLocated });
    },
  });

  // Remove saved, recently-checked AND good-today spots from the main list to
  // avoid showing the same spot twice in the panel (all are pinned sections).
  const mainSpots = spots.filter(
    (s) => !favorites.has(s.id) && !recentIdSet.has(s.id) && !goodTodayIdSet.has(s.id)
  );
  const emptyStateMode = getSpotListEmptyState(spots.length, savedSpots.length, recentSpots.length);

  if (emptyStateMode === "full") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex flex-col items-center justify-center py-16 text-center px-4"
      >
        <p className="text-(--dark) font-semibold">{emptyState?.title ?? "No spots match your filters"}</p>
        <button
          onClick={onClearFilters}
          className="mt-3 min-h-11 px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-(--muted) hover:border-(--accent) hover:text-(--dark) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) transition-colors"
        >
          {emptyState?.clearLabel ?? "Clear filters"}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      {/* First-run nudge: the save feature was invisible (0 saves in week 1), so
          tell people it exists. Drops away the moment they save anything. */}
      {savedSpots.length === 0 && onToggleFavorite && mainSpots.length > 0 && (
        <p className="px-4 pt-2.5 pb-1 text-[11px] text-(--muted)">
          {isStandalone ? (
            <>Watch your spots again here to get alerts. The installed app starts fresh, so anything you watched in Safari isn&rsquo;t here yet.</>
          ) : (
            <>Tap <span style={{ color: "var(--saved)" }}>♥</span> to watch a spot&rsquo;s conditions.</>
          )}
        </p>
      )}

      {/* Saved spots section, pinned at top regardless of filters */}
      {savedSpots.length > 0 && (
        <div ref={savedSectionRef}>
          <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-(--muted) uppercase tracking-wider">Watching</span>
            <span className="text-[11px] text-(--muted) opacity-60">({savedSpots.length})</span>
            {!alertsOn && (
              <button
                onClick={() => window.dispatchEvent(new Event("ptw:enablealerts"))}
                className="ml-auto text-[11px] font-semibold text-(--accent) hover:opacity-80"
              >
                Turn on alerts
              </button>
            )}
          </div>
          {rankSavedSpotsByConditions(savedSpots, condBySpot).map((spot) => (
            <div key={spot.id} ref={selected?.id === spot.id ? selectedRef : null}>
              <SpotCard
                spot={spot}
                crowd={reviewsOn ? aggregates[spot.id] : undefined}
                selected={selected?.id === spot.id}
                onClick={() => onSelect(spot, "list")}
                distance={distanceMap?.[spot.id]}
                isFavorite={true}
                onToggleFavorite={onToggleFavorite}
                conditionsBadge={<ConditionsBadge state={condBySpot[spot.id] ?? "loading"} />}
              />
            </div>
          ))}
          <div className="mx-4 my-1.5 border-t border-gray-200" />
        </div>
      )}

      {/* Good to paddle today (item 61): the cold-open ranked surface. A third
          pinned section, above Recently checked, so a first-time visitor with an
          empty Watching/Recently gets an immediate answer to "where's good
          today?". Calm-only, never padded to a row count; honest states when
          nothing is calm or the check failed. Gated by the good-today switch. */}
      {goodTodayEnabled && goodTodayHasCandidates && (
        <div ref={goodTodaySectionRef}>
          <div className="px-4 pt-3 pb-1.5">
            <span className="text-[11px] font-semibold text-(--muted) uppercase tracking-wider">Good to paddle today</span>
          </div>
          {/* Safety caveat, co-rendered with the affirmative "good to paddle"
              claim, exactly as every other surface that uses that phrase does
              (push, email, conditions panel, install prompt; enforced by
              lib/alerts/no-inducement.test.ts). The canonical wording verbatim,
              never a competing second phrasing. */}
          <p className="px-4 pb-1.5 text-[10px] text-gray-400 leading-snug">
            Guidance only, not a safety guarantee. Conditions shift fast on the water.
          </p>
          {/* Announce the resolution once, not every row, to avoid a screen
              reader re-reading full cards on each mutation. */}
          <span className="sr-only" aria-live="polite">
            {goodTodayLoading
              ? ""
              : goodTodaySpots.length > 0
                ? `${goodTodaySpots.length} ${goodTodaySpots.length === 1 ? "spot" : "spots"} good to paddle today`
                : goodTodayFailed
                  ? "Couldn't check conditions right now."
                  : "Nothing's calm nearby right now."}
          </span>
          {goodTodayLoading ? (
            <div className="px-4 pb-2 space-y-2" aria-hidden>
              <div className="h-11 rounded-lg bg-gray-100 animate-pulse" />
              <div className="h-11 rounded-lg bg-gray-100 animate-pulse" />
            </div>
          ) : goodTodaySpots.length > 0 ? (
            goodTodaySpots.map(({ spot, signal }) => (
              <div key={spot.id} ref={selected?.id === spot.id ? selectedRef : null}>
                <SpotCard
                  spot={spot}
                  crowd={reviewsOn ? aggregates[spot.id] : undefined}
                  selected={selected?.id === spot.id}
                  onClick={() => {
                    trackIntent("good_today_clicked", { spot_id: spot.id, region: spot.region });
                    onSelect(spot, "list");
                  }}
                  distance={distanceMap?.[spot.id]}
                  isFavorite={favorites.has(spot.id)}
                  onToggleFavorite={onToggleFavorite}
                  conditionsBadge={<ConditionsBadge state={signal.nowPaddleability} />}
                />
              </div>
            ))
          ) : goodTodayFailed ? (
            <p className="px-4 pb-2 text-xs text-(--muted)">Couldn&rsquo;t check conditions right now. Browse spots below.</p>
          ) : (
            <p className="px-4 pb-2 text-xs text-(--muted)">Nothing&rsquo;s calm nearby right now. Browse spots below.</p>
          )}
          <div className="mx-4 my-1.5 border-t border-gray-200" />
        </div>
      )}

      {/* Recently checked (item 26): a cold-open return strip of spots this
          device viewed recently, with live paddleability. Pinned like Watching,
          regardless of filters; already deduped against the saved set. */}
      {recentSpots.length > 0 && (
        <div ref={recentSectionRef}>
          <div className="px-4 pt-3 pb-1.5">
            <span className="text-[11px] font-semibold text-(--muted) uppercase tracking-wider">Recently checked</span>
          </div>
          {recentSpots.map((spot) => (
            <div key={spot.id} ref={selected?.id === spot.id ? selectedRef : null}>
              <SpotCard
                spot={spot}
                crowd={reviewsOn ? aggregates[spot.id] : undefined}
                selected={selected?.id === spot.id}
                onClick={() => {
                  trackIntent("recent_spot_clicked", { spot_id: spot.id, region: spot.region });
                  onSelect(spot, "list");
                }}
                distance={distanceMap?.[spot.id]}
                isFavorite={favorites.has(spot.id)}
                onToggleFavorite={onToggleFavorite}
                conditionsBadge={<ConditionsBadge state={recentCondBySpot[spot.id] ?? "loading"} />}
              />
            </div>
          ))}
          <div className="mx-4 my-1.5 border-t border-gray-200" />
        </div>
      )}

      {/* Inline zero-match state follows pinned content so saved and recent spots
          remain useful when the incoming filtered list has no matches. */}
      {emptyStateMode === "inline" && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="flex flex-col items-center py-8 text-center px-4"
        >
          <p className="text-(--dark) font-semibold">{emptyState?.title ?? "No spots match your filters"}</p>
          <button
            onClick={onClearFilters}
            className="mt-3 min-h-11 px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-(--muted) hover:border-(--accent) hover:text-(--dark) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) transition-colors"
          >
            {emptyState?.clearLabel ?? "Clear filters"}
          </button>
        </div>
      )}

      {/* Main list */}
      {mainSpots.map((spot) => (
        <div key={spot.id} ref={selected?.id === spot.id ? selectedRef : null}>
          <SpotCard
            spot={spot}
            crowd={reviewsOn ? aggregates[spot.id] : undefined}
            selected={selected?.id === spot.id}
            onClick={() => onSelect(spot, "list")}
            distance={distanceMap?.[spot.id]}
            isFavorite={favorites.has(spot.id)}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      ))}

      {/* The FULL-SIZE copy of the legal links. The map legend carries a
          deliberately tiny duplicate (item: owner asked for the map real
          estate back), so these anchors have to be the ones that meet the
          WCAG 2.5.8 24px target. py-1 on a 16px line box gets there. */}
      <div className="px-4 py-4 text-center border-t border-gray-100 flex items-center justify-center gap-2">
        <a href="/terms" className="inline-block py-1 text-xs text-(--muted) hover:text-(--dark) transition-colors">
          Terms
        </a>
        <span className="text-xs text-(--muted)/50" aria-hidden="true">
          &middot;
        </span>
        <a href="/disclaimer" className="inline-block py-1 text-xs text-(--muted) hover:text-(--dark) transition-colors">
          Disclaimer
        </a>
        <span className="text-xs text-(--muted)/50" aria-hidden="true">
          &middot;
        </span>
        <a href="/privacy" className="inline-block py-1 text-xs text-(--muted) hover:text-(--dark) transition-colors">
          Privacy
        </a>
      </div>
    </div>
  );
}
