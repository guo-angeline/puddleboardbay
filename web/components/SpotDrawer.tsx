"use client";

import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";
import { trackIntent } from "@/lib/analytics";
import { getSpotPhoto } from "@/lib/spotPhotos";
import { useKillSwitch } from "@/lib/experiments";
import { useGenuineView } from "@/lib/useGenuineView";
import ConditionsPanel from "@/components/ConditionsPanel";
import ReviewsSection from "@/components/ReviewsSection";
import SignInSheet from "@/components/SignInSheet";
import { useAccount } from "@/lib/useAccount";
import { useReviewAggregates } from "@/lib/useReviewAggregates";

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

// Item 70: tabbable elements for the full-screen sheet's focus trap.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  // Item 57 (D27): every mobile spot sheet opens FULL SCREEN and the drag-to-
  // resize handle is gone. Behind a kill switch (default ON, no A/B, DAU<100);
  // if disabled it falls back to the old peek + drag behavior for rollback.
  const fullScreen = useKillSwitch("sheet-auto-expand");
  // Item 43: crowd rating (present only at 5+ published reviews).
  const reviewsOn = useKillSwitch("reviews");
  const aggregates = useReviewAggregates();
  const { user, enabled: authOn } = useAccount();
  // Which spot the review form / sign-in prompt is open for, NOT a boolean.
  // Storing the id makes "close when the sheet switches spots" a derived fact
  // rather than a reset effect (setState-in-effect is a lint error here).
  const [reviewFormFor, setReviewFormFor] = useState<number | null>(null);
  const [signInFor, setSignInFor] = useState<number | null>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    // Item 57: full-screen mode always opens at FULL. Item 9's share/alert
    // startExpanded still forces FULL in the rollback (drag) mode too.
    // Read once on mount (the `h ?? ` guard means a later drag is never clobbered).
    const initFraction = fullScreen || startExpanded ? FULL : PEEK;
    if (fullScreen || startExpanded) snapState.current = "full";
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
      // spot_sheet_dismissed now requires the spot fields (item 71 typed the
      // method union + required spot_id/name/region); only log with a spot.
      if (spot) {
        trackIntent("spot_sheet_dismissed", {
          spot_id: spot.id,
          spot_name: spot.water,
          region: spot.region,
          method: "drag",
        });
      }
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

  // Item 70: full-screen mobile sheet is a modal dialog. It covers the whole
  // viewport, so a keyboard user must not be able to Tab "behind" it and AT
  // must be told a dialog opened. Scoped to the full-screen mobile branch only
  // (`forceFull`); the desktop side panel is a persistent non-modal region and
  // keeps interacting with the map/list beside it, so it gets NONE of this.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const forceFull = isMobile && fullScreen;
    const panel = panelRef.current;
    if (!forceFull || !panel) return;

    // Move focus into the dialog on open (the container carries role=dialog +
    // aria-labelledby, so a screen reader announces the spot name). Remember
    // what opened it (the list row / map pin) to restore on close.
    const opener = document.activeElement as HTMLElement | null;
    panel.focus({ preventScroll: true });

    // Make everything behind the dialog inert (removed from tab order + hidden
    // from AT). The panel + backdrop are siblings of the background content
    // under HomeClient's root; inert the siblings, skip the drawer's own nodes.
    const root = panel.parentElement;
    const backdrop = root?.querySelector<HTMLElement>("[data-sheet-backdrop]");
    const inerted: HTMLElement[] = [];
    if (root) {
      for (const child of Array.from(root.children)) {
        const el = child as HTMLElement;
        if (el === panel || el === backdrop) continue;
        if (!el.hasAttribute("inert")) {
          el.setAttribute("inert", "");
          inerted.push(el);
        }
      }
    }

    // Trap Tab / Shift+Tab within the dialog.
    function onTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onTrap);

    return () => {
      document.removeEventListener("keydown", onTrap);
      inerted.forEach((el) => el.removeAttribute("inert"));
      // Restore focus to whatever opened the sheet, if it's still in the DOM.
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [isMobile, fullScreen]);

  // Item 39: the owner's own rating, on the spots that carry one. Shipped at
  // 100% by owner directive 2026-07-17 (D20), so it renders unconditionally
  // rather than behind a flag: it is editorial content, and gating it on
  // PostHog resolving a feature flag would make it vanish for anyone who blocks
  // analytics. `spot_action` still carries owner_rating + owner_rating_shown,
  // so engagement with rated spots is still measurable without an experiment.
  const showOwnerRating = typeof spot?.owner_rating === "number";
  // Item 43: present only once this spot has 5+ published reviews.
  // The `reviews` kill switch must pull the crowd number too, not just the
  // reviews list: an average left standing with its source hidden is worse
  // than no average.
  const crowd = spot && reviewsOn ? aggregates[spot.id] : undefined;

  // Item 31: per-spot photo. Kill-switch flag (default ON, no A/B per the
  // DAU<100 rule); only ~57 spots have a vision-verified free-licensed photo,
  // the rest render nothing. Dwell-gated view event so it means "a human looked".
  const showPhotos = useKillSwitch("spot-photos");
  const photo = spot ? getSpotPhoto(spot.id) : null;
  const photoViewRef = useGenuineView({
    key: spot?.id ?? "none",
    enabled: showPhotos && !!photo && !!spot,
    onView: () => {
      if (spot && photo) {
        trackIntent("spot_photo_viewed", { spot_id: spot.id, region: spot.region, license: photo.license ?? "owner" });
      }
    },
  });

  if (!spot) return null;

  // Item 57: with the drag gone, the × and the backdrop are the dismiss paths.
  // Keep spot_sheet_dismissed alive (it's a guardrail) by tagging the method,
  // so the metric doesn't just vanish when the drag ("drag" method) is removed.
  const dismiss = (method: "close" | "backdrop" | "back") => {
    trackIntent("spot_sheet_dismissed", { spot_id: spot.id, spot_name: spot.water, region: spot.region, method });
    onClose();
  };
  // Item 57/63: full-screen mobile sheet (kill switch ON). Rollback = drag mode.
  // Item 63: full-screen uses fixed inset:0 (below), so it reads NO innerHeight,
  // that is what kills the iOS URL-bar scroll wobble. renderH is only for the
  // rollback peek/drag path now.
  const forceFull = isMobile && fullScreen;
  const renderH = sheetH;

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

  // "Review" sits in the action row next to Share, so the tap target and the
  // form it opens are in different places. Scroll the reviews section back into
  // view so the form is never opened off-screen above the fold.
  function handleReview() {
    trackIntent("review_form_opened", { spot_id: spot!.id, region: spot!.region });
    if (user) setReviewFormFor(spot!.id);
    else setSignInFor(spot!.id); // signed out is a prompt, not a dead end
    requestAnimationFrame(() =>
      reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    );
  }

  return (
    <>
      {/* Backdrop (mobile) — tap to dismiss (a non-drag dismiss path, item 57). */}
      <div
        data-sheet-backdrop
        className="fixed inset-0 bg-black/20 md:hidden"
        style={{ zIndex: 1100 }}
        onClick={() => dismiss("backdrop")}
      />

      {/* Drawer panel. Item 63: full-screen mode drops the rounded top + shadow
          (a viewport-covering surface clips its own corners and has no edge to
          shadow); rollback keeps them (it's still a partial sheet). Item 70: in
          the full-screen mobile branch this is a modal dialog (role + labelled
          by the spot name + focusable container for the open-focus move); the
          desktop side panel (md:static) gets none of those, it is not modal. */}
      <div
        ref={panelRef}
        {...(forceFull
          ? { role: "dialog", "aria-modal": true, "aria-labelledby": "spot-sheet-title", tabIndex: -1 }
          : {})}
        // Desktop sheet width: 1.5x the original 320px, applied from `lg` only.
        // Tablet keeps 320px on purpose. At 820px the list (320) plus a wider
        // sheet leaves the map ~116px, which is worse than the sheet is better;
        // the full 480px lands at lg+ where there is room for all three panes.
        className={`fixed bottom-0 left-0 right-0 md:static md:border-l md:border-gray-200 md:z-auto bg-white md:w-80 lg:w-[30rem] md:shrink-0 md:rounded-none overflow-y-auto max-h-[58vh] md:max-h-none md:h-full md:shadow-none focus:outline-none ${forceFull ? "" : "rounded-t-2xl shadow-2xl"}`}
        style={{
          zIndex: 1200,
          ...(forceFull
            ? {
                // Item 63: cover the whole viewport with fixed insets, no
                // innerHeight read, no height transition. The remaining wobble
                // the owner saw at the scroll extremes is the panel's OWN
                // rubber-band bounce: the app shell is already locked and every
                // `.overflow-y-auto` already has `overscroll-behavior: contain`
                // (globals.css), which only stops *chaining* and still permits
                // the bounce. `none` suppresses the bounce itself; it must be
                // inline to beat that global class rule. safe-area-top is on the
                // sticky bar.
                position: "fixed",
                inset: 0,
                maxHeight: "none",
                transition: "none",
                overscrollBehavior: "none",
              }
            : isMobile && renderH != null
              ? {
                  // Rollback (peek/drag) path, unchanged. Anchor the box's bottom
                  // edge at the *physical* screen bottom so the sheet paints
                  // through the home-indicator inset; height grows by that inset.
                  height: `calc(${renderH}px + env(safe-area-inset-bottom))`,
                  bottom: "calc(-1 * env(safe-area-inset-bottom))",
                  maxHeight: "none",
                  transition: dragging ? "none" : "height 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
                }
              : {}),
        }}
      >
        {/* Item 63: full-screen mode gets a slim sticky app bar (spot name + a
            real close button), NOT a grabber pill, so nothing signals a drag
            that no longer exists. Rollback mode keeps the draggable pill. */}
        {fullScreen ? (
          // Item 64: back arrow leads, then the brand wordmark (NOT the spot
          // name, which already renders as the <h1> below). Full-screen is a
          // page, so the control is "back to the map", not a modal close.
          <div
            className="sticky top-0 z-10 flex items-center gap-2 bg-white md:hidden"
            style={{
              borderBottom: "1px solid var(--border)",
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
              paddingBottom: "0.625rem",
              paddingLeft: "0.5rem",
              paddingRight: "1rem",
            }}
          >
            <button
              onClick={() => dismiss("back")}
              aria-label="Back to the map"
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-(--fill) text-(--dark) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <span className="font-['Newsreader'] text-base font-bold text-(--dark) leading-none select-none">
              Paddle to Water
            </span>
          </div>
        ) : (
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
        )}

        <div
          className="p-5 pt-1.5 md:pt-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 id="spot-sheet-title" className="font-['Newsreader'] text-xl font-bold text-(--dark) leading-tight">
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
                {/* Item 43 (owner decision): at 5+ published reviews the CROWD
                    number takes this slot. The owner's own rating is not lost,
                    it moves to its own labelled line below, so the two are
                    never blended into one ambiguous star (D24). */}
                {crowd ? (
                  <span className="font-semibold text-(--dark)">
                    <span aria-hidden className="text-(--accent)">&#9733;</span> {crowd.avg.toFixed(1)}
                    <span className="sr-only"> out of 5 from {crowd.count} paddler reviews</span>
                    <span aria-hidden className="font-normal text-(--muted)"> ({crowd.count})</span>
                    {" · "}
                  </span>
                ) : showOwnerRating ? (
                  <span className="font-semibold text-(--dark)">
                    <span aria-hidden className="text-(--accent)">&#9733;</span> {spot.owner_rating!.toFixed(1)}
                    <span className="sr-only"> out of 5</span>
                    {" · "}
                  </span>
                ) : null}
                {spot.city} &middot; {spot.region}
              </p>
              {/* Once the crowd number is in the subtitle, the owner's rating is
                  shown separately and explicitly attributed, so a reader can
                  always tell which is which. */}
              {crowd && showOwnerRating && (
                <p className="text-xs text-(--muted) mt-0.5">
                  <span aria-hidden className="text-(--accent)">&#9733;</span>{" "}
                  {spot.owner_rating!.toFixed(1)} our take
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss("close")}
              className={`text-gray-400 hover:text-gray-600 shrink-0 mt-0.5 text-xl leading-none ${fullScreen ? "hidden md:inline-flex" : ""}`}
              aria-label={`Close ${spot.water}`}
            >
              ×
            </button>
          </div>

          {/* Badges + tags — one wrapping row, not two stacked ones. */}
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
            {tags.map((t) => <Tag key={t} label={t} />)}
          </div>

          {/* Item 31: spot photo. Modest height so the conditions panel (the
              reason to come back) still sits near the peek fold. CC-BY/BY-SA
              require attribution, so author + license + source always render. */}
          {showPhotos && photo && (
            <figure ref={photoViewRef} className="mb-3 -mx-1 relative">
              {/* Self-hosted derivatives are already sized to 800px; next/image
                  optimization would add Vercel image cost for no gain here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.file}
                alt={`${spot.water}, ${spot.city ?? spot.region}`}
                loading="lazy"
                className="w-full h-40 md:h-44 object-cover rounded-lg bg-gray-100"
              />
              {/* Attribution is overlaid on the image, not a separate line: most
                  third-party photos are CC-BY/BY-SA and legally require credit,
                  but it must not cost sheet space (owner directive 2026-07-18).
                  Small, legible over a subtle gradient; links to author source +
                  license. Owner first-party photos carry no author, so the credit
                  line is omitted entirely for them, as do CC0/public-domain
                  photos, which record an author for provenance but waive the
                  credit (`attribution_required: false`). */}
              {photo.author && photo.attribution_required !== false && (
                <figcaption className="absolute inset-x-0 bottom-0 px-2 py-0.5 text-[10px] leading-tight text-white/85 bg-gradient-to-t from-black/55 to-transparent rounded-b-lg">
                  <a href={photo.source_page} target="_blank" rel="noopener noreferrer" className="hover:underline">{photo.author}</a>
                  {" / "}
                  {photo.license_url ? (
                    <a href={photo.license_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{photo.license}</a>
                  ) : (
                    photo.license
                  )}
                </figcaption>
              )}
            </figure>
          )}

          {/* Notes — truncated on mobile, full on desktop */}
          {spot.notes && (
            <div className="mb-3">
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

          {/* Item 43: crowd reviews, below conditions so the retention
              differentiator keeps the higher position. The trigger lives in the
              action row; this renders the list and the form. */}
          <ReviewsSection
            key={spot.id}
            ref={reviewsRef}
            spot={spot}
            formOpen={reviewFormFor === spot.id}
            onCloseForm={() => setReviewFormFor(null)}
          />

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
            {/* Share + Review are peers: same weight, same outline, one row.
                Review used to be a lone bordered button buried in the reviews
                section, which read as a different kind of control than every
                other thing you can do to a spot. */}
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                {copied ? "Copied!" : "Share"}
              </button>
              {reviewsOn && authOn && (
                <button
                  onClick={handleReview}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  Review
                </button>
              )}
            </div>
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

      {signInFor === spot.id && (
        <SignInSheet
          reason="Sign in or sign up to leave a review."
          onClose={() => setSignInFor(null)}
        />
      )}
    </>
  );
}
