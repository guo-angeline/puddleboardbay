"use client";

import { earnedLine } from "@/lib/markCopy";
import type { MarkId } from "@/lib/marks";

/**
 * Item 83: the moment after a review is submitted.
 *
 * The mark draws itself in one stroke over 600ms, once, then sits still. No
 * confetti, no gold, no bounce, no sound: this is a logbook, and the visual
 * language is ink on paper, not a slot machine.
 *
 * Reduced motion is handled in CSS, not JS. `globals.css` carries a
 * `prefers-reduced-motion: reduce` block that cancels both animations with
 * `!important` and pins the stroke to its finished state, so the mark still
 * renders, simply without drawing. Doing it here in JS would mean reading
 * matchMedia into state inside an effect, which this codebase lints against.
 */
export default function MarkMoment({ message, mark }: { message: string; mark: MarkId | null }) {
  const earned = mark ? earnedLine(mark) : null;
  // 2*pi*r for r=15, so one dash covers the ring exactly once.
  const CIRCUMFERENCE = 94.2;

  return (
    // role="status" because this replaces the submit confirmation: it appears
    // with no focus change, and it carries the moderation promise, which is the
    // one string in the flow that most needs to reach everyone (WCAG 4.1.3).
    <div role="status" className="mt-2 flex items-start gap-3 rounded-lg bg-(--fill) px-3 py-2.5">
      {earned && (
        <svg
          width="34"
          height="34"
          viewBox="0 0 34 34"
          aria-hidden
          className="mt-0.5 shrink-0"
          style={{ color: "var(--accent)" }}
        >
          <circle
            cx="17"
            cy="17"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            transform="rotate(-90 17 17)"
            style={{
              strokeDasharray: CIRCUMFERENCE,
              strokeDashoffset: CIRCUMFERENCE,
              animation: "ptw-mark-draw 600ms ease-out forwards",
            }}
          />
          {/* A wave, deliberately not a checkmark: a tick reads as an item
              ticked off a list, and a list of launch sites is a list nobody
              should feel invited to complete. */}
          <path
            d="M10 19c2-2.2 4-2.2 6 0s4 2.2 6 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ opacity: 0, animation: "ptw-mark-fade 300ms ease-out 400ms forwards" }}
          />
        </svg>
      )}
      <div className="text-sm text-(--dark)">
        {earned && <p className="font-semibold">{earned.title}</p>}
        <p className={earned ? "text-(--muted)" : undefined}>{earned ? earned.line : message}</p>
        {earned && <p className="mt-0.5 text-(--muted)">{message}</p>}
      </div>
    </div>
  );
}
