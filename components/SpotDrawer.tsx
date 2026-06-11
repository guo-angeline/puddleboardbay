"use client";

import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL, DIFFICULTY_COLOR } from "@/lib/types";
import { nearbySpots } from "@/lib/distance";
import { track } from "@/lib/analytics";
import FeedbackModal from "@/components/FeedbackModal";
import ConditionsPanel from "@/components/ConditionsPanel";

interface Props {
  spot: Spot | null;
  onClose: () => void;
  onSelect: (spot: Spot) => void;
  allSpots: Spot[];
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
}

const DIFF_STYLES: Record<string, { bg: string; text: string }> = {
  flatwater: { bg: "#ECFDF5", text: "#065F46" },
  bay:       { bg: "#F0F9FF", text: "#0369A1" },
  river:     { bg: "#FFF7ED", text: "#9A3412" },
  unknown:   { bg: "#F5F5F4", text: "#78716C" },
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

export default function SpotDrawer({ spot, onClose, onSelect, allSpots, isFavorite, onToggleFavorite }: Props) {
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
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
    const sync = () => {
      setIsMobile(mq.matches);
      if (mq.matches) setSheetH((h) => h ?? Math.round(window.innerHeight * PEEK));
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
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
      track("spot_sheet_dismissed", { ...info, method: "drag" });
      onClose();
      return;
    }
    const next = h > (peek + full) / 2 ? "full" : "peek";
    setSheetH(next === "full" ? full : peek);
    // Only log real state changes, so a drag that resettles at peek isn't noise.
    if (next !== snapState.current) {
      snapState.current = next;
      track("spot_sheet_resized", { ...info, to: next });
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const nearby = nearbySpots(spot, allSpots, 3);

  // Shared identity for the bottom-of-funnel action events.
  const spotEventProps = {
    spot_id: spot.id,
    spot_name: spot.water,
    region: spot.region,
    has_fee: spot.has_fee,
  };

  async function handleShare() {
    track("spot_action", { ...spotEventProps, action: "share" });
    const url = `${window.location.origin}/spot/${spot!.id}`;
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
                height: sheetH,
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
          className="sticky top-0 z-10 bg-white flex justify-center pt-3 pb-2.5 cursor-grab active:cursor-grabbing md:hidden"
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
          className="p-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-['Fraunces'] text-xl font-bold text-[--dark] leading-tight">
                {spot.water}
              </h2>
              <p className="text-sm text-[--muted] mt-1">{spot.city} &middot; {spot.region}</p>
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
          <div className="flex flex-wrap gap-2 mb-4">
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
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((t) => <Tag key={t} label={t} />)}
            </div>
          )}

          {/* Notes — truncated on mobile, full on desktop */}
          {spot.notes && (
            <div className="mb-4 pl-3 border-l-2 border-gray-200">
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
                  className="md:hidden mt-1 text-sm font-medium text-[--accent] hover:opacity-80 transition-opacity"
                >
                  {notesExpanded ? "Read less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* Live tide + wind — the reason to come back. */}
          <ConditionsPanel spot={spot} />

          {/* Nearby spots — desktop sidebar only; map handles discovery on mobile */}
          {nearby.length > 0 && (
            <div className="hidden md:block mb-5">
              <p className="text-xs font-semibold text-[--muted] uppercase tracking-wide mb-2">Nearby</p>
              <div className="space-y-0.5">
                {nearby.map(({ spot: s, miles }) => (
                  <button
                    key={s.id}
                    onClick={() => { onClose(); onSelect(s); }}
                    className="flex items-center gap-2.5 w-full text-left py-2 px-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: DIFFICULTY_COLOR[s.difficulty] }}
                    />
                    <span className="flex-1 text-sm text-[--dark] truncate">{s.water}</span>
                    <span className="text-xs text-[--muted] shrink-0">
                      {miles < 1
                        ? `${Math.round(miles * 5280)} ft`
                        : `${miles.toFixed(1)} mi`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions — Share + Photos side-by-side, Get Directions full-width below */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
                style={{ borderColor: "#e5e7eb", color: "var(--dark)" }}
              >
                {copied ? "Copied!" : "Share"}
              </button>
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(spot!.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
                  style={isFavorite
                    ? { borderColor: "#fecdd3", color: "#e11d48", background: "#fff1f2" }
                    : { borderColor: "#e5e7eb", color: "var(--muted)" }
                  }
                  aria-label={isFavorite ? "Remove from saved spots" : "Save this spot"}
                >
                  <span className="text-base leading-none">{isFavorite ? "♥" : "♡"}</span>
                  <span>{isFavorite ? "Saved" : "Save"}</span>
                </button>
              )}
              <a
                href={photosUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("spot_action", { ...spotEventProps, action: "photos" })}
                className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                Photos
              </a>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("spot_action", { ...spotEventProps, action: "directions" })}
              className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Get Directions
            </a>
          </div>

          {/* Report link */}
          <button
            onClick={() => setReportOpen(true)}
            className="mt-3 text-xs text-[--muted] hover:text-[--dark] transition-colors w-full text-center"
          >
            Report an issue with this spot
          </button>
        </div>
      </div>

      {/* Report modal — rendered here so it sits above the drawer */}
      {reportOpen && (
        <FeedbackModal
          onClose={() => setReportOpen(false)}
          defaultType="issue"
          defaultMessage={`Issue with: ${spot.water}\n\n`}
        />
      )}
    </>
  );
}
