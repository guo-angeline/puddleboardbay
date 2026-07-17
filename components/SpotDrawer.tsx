"use client";

import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";
import { trackIntent } from "@/lib/analytics";
import ConditionsPanel from "@/components/ConditionsPanel";

interface Props {
  spot: Spot | null;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
  // Item 9: open the mobile sheet at full height instead of the peek height.
  // Set for shared-link arrivals so the recipient sees the conditions view and
  // the CTA row without having to discover the drag. Item 42 reuses this same
  // one-shot prop to generalize the expanded open to every other mobile spot
  // open, behind the spot_sheet_full_height flag (HomeClient decides the
  // value; this component stays a dumb consumer either way).
  startExpanded?: boolean;
}

const DIFF_STYLES: Record<string, { bg: string; text: string }> = {
  flatwater: { bg: "#DBF3F0", text: "#0E7F78" },
  bay:       { bg: "#E3EEFA", text: "#0B4E96" },
  river:     { bg: "#FDEAE0", text: "#CC5528" },
  unknown:   { bg: "#EEF3F9", text: "#8AA0B4" },
};

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-600 font-medium">
      {label}
    </span>
  );
}

// Notes carry the launch/put-in detail a paddler actually needs. 150 clipped it
// mid-sentence on nearly every spot, forcing a "Read more" tap each time; 220
// fits the key access info before the fold.
const NOTES_TRUNCATE = 220;

// Mobile bottom-sheet snap points, as a fraction of viewport height.
const PEEK = 0.58; // default resting height
const FULL = 0.92; // dragged-up / expanded height

export default function SpotDrawer({ spot, onClose, isFavorite, onToggleFavorite, startExpanded }: Props) {
  const [copied, setCopied] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Draggable mobile sheet. The handle (not the content) is the drag surface, so
  // dragging the grabber moves the sheet while the body still scrolls on its own.
  const [isMobile, setIsMobile] = useState(false);
  const [sheetH, setSheetH] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startH: number } | null>(null);
  const snapState = useRef<"peek" | "full">("peek");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    // Item 9: shared-link arrivals open at FULL height; everything else at PEEK.
    // Read once on mount (the `h ?? ` guard means a later drag is never clobbered).
    const initFraction = startExpanded ? FULL : PEEK;
    if (startExpanded) snapState.current = "full";
    const sync = () => {
      setIsMobile(mq.matches);
      if (mq.matches) setSheetH((h) => h ?? Math.round(window.innerHeight * initFraction));
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  // Mount-only: startExpanded is an initial-height hint, not a live control.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onHandleStart(e: ReactTouchEvent) {
    drag.current = {
      startY: e.touches[0].clientY,
      startH: sheetH ?? window.innerHeight * PEEK,
    };
    setDragging(true);
  }
  function onHandleMove(e: ReactTouchEvent) {
    if (!drag.current) return;
    const dh = drag.current.startY - e.touches[0].clientY; // up = taller
    const max = window.innerHeight * FULL;
    setSheetH(Math.min(max, Math.max(120, drag.current.startH + dh)));
  }
  function onHandleEnd() {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    const peek = window.innerHeight * PEEK;
    const full = window.innerHeight * FULL;
    const h = sheetH ?? peek;
    const info = spot ? { spot_id: spot.id, spot_name: spot.water, region: spot.region } : {};
    // Dragged well below the peek height -> dismiss; else snap to nearer point.
    if (h < peek * 0.6) {
      trackIntent("spot_sheet_dismissed", { ...info, method: "drag" });
      onClose();
      return;
    }
    const next = h > (peek + full) / 2 ? "full" : "peek";
    setSheetH(next === "full" ? full : peek);
    // Only log real state changes, so a drag that resettles at peek isn't noise.
    if (next !== snapState.current) {
      snapState.current = next;
      trackIntent("spot_sheet_resized", { ...info, to: next });
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Item 39: the owner's own rating, on the spots that carry one. Shipped at
  // 100% by owner directive 2026-07-17 (D20), so it renders unconditionally
  // rather than behind a flag: it is editorial content, and gating it on
  // PostHog resolving a feature flag would make it vanish for anyone who blocks
  // analytics. `spot_action` still carries owner_rating + owner_rating_shown,
  // so engagement with rated spots is still measurable without an experiment.
  const showOwnerRating = typeof spot?.owner_rating === "number";

  if (!spot) return null;

  const diff = DIFF_STYLES[spot.difficulty] ?? DIFF_STYLES.unknown;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
  const photosUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${spot.water} ${spot.city ?? ""} California`)}/`;

  const tags: string[] = [];
  if (spot.dog_friendly)        tags.push("Dog friendly");
  if (spot.tide_sensitive)      tags.push("Tide sensitive");
  if (spot.rentals_available)   tags.push("Rentals available");
  if (spot.inspection_required) tags.push("Inspection required");
  if (spot.power_boats === true)  tags.push("Power boats OK");
  if (spot.power_boats === false) tags.push("No power boats");

  // Shared identity for the bottom-of-funnel action events.
  const spotEventProps = {
    spot_id: spot.id,
    spot_name: spot.water,
    region: spot.region,
    has_fee: spot.has_fee,
    // Item 39: carried so the readout can ask the actual hypothesis (do people
    // act more on higher-rated spots?) without joining back to spots.json, and
    // so it segments by region, which is where this field's signal lives or
    // dies. `null` distinguishes an unrated spot from an unrated arm.
    owner_rating: spot.owner_rating ?? null,
    owner_rating_shown: showOwnerRating,
  };

  async function handleShare() {
    trackIntent("spot_action", { ...spotEventProps, action: "share" });
    // `from=share` lets the recipient's app open the spot with the sheet
    // expanded (item 9), and tags the arrival's spot_viewed as source:"share".
    const url = `${window.location.origin}/spot/${spot!.id}?from=share`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: spot!.water,
          url,
        });
      } catch { /* user cancelled */ }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 bg-black/20 md:hidden"
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed bottom-0 left-0 right-0 md:static md:border-l md:border-gray-200 md:z-auto bg-white md:w-80 md:shrink-0 rounded-t-2xl md:rounded-none overflow-y-auto max-h-[58vh] md:max-h-none md:h-full shadow-2xl md:shadow-none"
        style={{
          zIndex: 1200,
          ...(isMobile && sheetH != null
            ? {
                // Anchor the box's bottom edge at the *physical* screen bottom, not
                // the layout-viewport bottom, so the white sheet paints through the
                // home-indicator safe-area inset instead of leaving the page canvas
                // showing. Height grows by the same inset so the visible top (peek
                // height) is unchanged; inner content padding keeps text above the
                // indicator.
                height: `calc(${sheetH}px + env(safe-area-inset-bottom))`,
                bottom: "calc(-1 * env(safe-area-inset-bottom))",
                maxHeight: "none",
                transition: dragging ? "none" : "height 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
              }
            : {}),
        }}
      >
        {/* Handle (mobile) — drag to expand to full screen, down to peek/dismiss.
            Sticky so it stays grabbable when the body scrolls; touch-action none so
            the gesture drags the sheet instead of scrolling. */}
        <div
          className="sticky top-0 z-10 bg-white flex justify-center pt-2 pb-1.5 cursor-grab active:cursor-grabbing md:hidden"
          style={{ touchAction: "none" }}
          onTouchStart={onHandleStart}
          onTouchMove={onHandleMove}
          onTouchEnd={onHandleEnd}
          role="slider"
          aria-label="Resize panel: drag up to expand, down to dismiss"
          aria-valuenow={sheetH != null && typeof window !== "undefined" ? Math.round((sheetH / window.innerHeight) * 100) : 58}
          aria-valuemin={0}
          aria-valuemax={92}
        >
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div
          className="p-5 pt-1.5 md:pt-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="font-['Newsreader'] text-xl font-bold text-(--dark) leading-tight">
                {spot.water}
              </h2>
              {/*
                Item 39. The owner's rating renders inline in the subtitle row as
                a bare "star + number", no qualifier text, in both the drawer and
                the list (D21, owner-directed 2026-07-17). The lawyer gate returned
                needs-changes on the bare form (a star+number reads as an aggregate
                crowd rating under FTC Act Section 5 net impression, worst in the
                list); the owner shipped it anyway with that finding in front of
                them and accepted the risk. The sr-only "out of 5" is scale only,
                so a screen reader does not announce a bare "4.5".
              */}
              <p className="text-sm text-(--muted) mt-1">
                {showOwnerRating && (
                  <span className="font-semibold text-(--dark)">
                    <span aria-hidden className="text-(--accent)">&#9733;</span> {spot.owner_rating!.toFixed(1)}
                    <span className="sr-only"> out of 5</span>
                    {" · "}
                  </span>
                )}
                {spot.city} &middot; {spot.region}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: diff.bg, color: diff.text }}
            >
              {DIFFICULTY_LABEL[spot.difficulty]}
            </span>
            {spot.has_fee === true && spot.fee_amount && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                ${spot.fee_amount} launch fee
              </span>
            )}
            {spot.has_fee === false && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                Free
              </span>
            )}
            {spot.has_fee === null && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                Fee unknown
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((t) => <Tag key={t} label={t} />)}
            </div>
          )}

          {/* Notes — truncated on mobile, full on desktop */}
          {spot.notes && (
            <div className="mb-3 pl-3 border-l-2 border-gray-200">
              <p className="text-sm text-gray-600 leading-relaxed">
                {/* Mobile: truncate unless expanded */}
                <span className="md:hidden">
                  {notesExpanded || spot.notes.length <= NOTES_TRUNCATE
                    ? spot.notes
                    : spot.notes.slice(0, NOTES_TRUNCATE).trimEnd() + "…"}
                </span>
                {/* Desktop: always full */}
                <span className="hidden md:inline">{spot.notes}</span>
              </p>
              {spot.notes.length > NOTES_TRUNCATE && (
                <button
                  onClick={() => setNotesExpanded((v) => !v)}
                  className="md:hidden mt-1 text-sm font-medium text-(--accent) hover:opacity-80 transition-opacity"
                >
                  {notesExpanded ? "Read less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* Live tide + wind — the reason to come back. */}
          <ConditionsPanel spot={spot} />

          {/* Actions — hierarchy optimizes for Save (retention) first, Share
              (virality) second; Get Directions + Photos are demoted to a neutral
              row. Shipped to 100% per owner direction 2026-07-09 (explicit
              exception to the A/B-flag policy, recorded in DECISIONS.md). */}
          <div className="flex flex-col gap-2">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(spot!.id)}
                className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl text-sm font-semibold border transition-colors"
                style={isFavorite
                  ? { borderColor: "#F5C6CE", color: "#E23B54", background: "#FDECEF" }
                  : { borderColor: "transparent", color: "#fff", background: "var(--accent)" }
                }
                aria-label={isFavorite ? "Stop watching this spot" : "Watch this spot"}
              >
                <span className="text-base leading-none">{isFavorite ? "♥" : "♡"}</span>
                <span>{isFavorite ? "Watching" : "Watch this spot"}</span>
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {copied ? "Copied!" : "Share"}
            </button>
            <div className="flex gap-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackIntent("spot_action", { ...spotEventProps, action: "directions" })}
                className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-gray-50"
                style={{ borderColor: "var(--border)", color: "var(--dark)" }}
              >
                Get directions
              </a>
              <a
                href={photosUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackIntent("spot_action", { ...spotEventProps, action: "photos" })}
                className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-gray-50"
                style={{ borderColor: "var(--border)", color: "var(--dark)" }}
              >
                Photos
              </a>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
