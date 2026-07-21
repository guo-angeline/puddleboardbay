"use client";

import { useState } from "react";
import { TERMS_VERSION, MAX_BODY_LENGTH } from "@/lib/reviews/validation";
import { trackIntent } from "@/lib/analytics";
import type { Spot } from "@/lib/types";

// Item 43: the review submit form. Two things here are legally load-bearing and
// must not be "simplified" later:
//
// 1. The assent checkbox is UNCHECKED by default, sits directly above the submit
//    button, and its label links the Contributor Terms. Submit stays disabled
//    until it is checked. This is the exact spec in the terms' implementation
//    prerequisites; the liability cap and class-action waiver only bind a
//    contributor who actually saw and accepted them.
// 2. We send the terms VERSION and a hash of what was shown, so a later dispute
//    can establish which text this person agreed to.

// Identifies the exact published text. Bump both together whenever Part 1 of
// docs/legal/ugc-contributor-terms.md changes in substance.
const TERMS_HASH = "ugc-v1.0-2026-07-21";

export default function ReviewForm({
  spot,
  onSubmitted,
  onCancel,
}: {
  spot: Spot;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [agreed, setAgreed] = useState(false); // NEVER default true
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || rating < 1 || !agreed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spotId: spot.id,
          rating,
          body: body.trim() || null,
          termsVersion: TERMS_VERSION,
          termsHash: TERMS_HASH,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not submit that. Try again.");
        setBusy(false);
        return;
      }
      trackIntent("review_submitted", {
        spot_id: spot.id,
        region: spot.region,
        rating,
        has_text: body.trim().length > 0,
      });
      onSubmitted();
    } catch {
      setError("Could not reach the server. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 rounded-xl border border-(--border) p-4">
      <fieldset className="border-0 p-0 m-0">
        <legend className="text-sm font-medium text-(--dark)">Your rating</legend>
        <div className="mt-1.5 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} out of 5`}
              aria-pressed={rating === n}
              className="rounded p-1 text-2xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
              style={{ color: n <= rating ? "var(--accent)" : "var(--border)" }}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="review-body" className="mt-3 block text-sm font-medium text-(--dark)">
        Your review <span className="font-normal text-(--muted)">(optional)</span>
      </label>
      <textarea
        id="review-body"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY_LENGTH))}
        rows={4}
        placeholder="What was the put-in like? Parking, access, what you saw."
        className="mt-1 w-full rounded-lg border border-(--border) px-3 py-2 text-sm text-(--dark) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
      />
      <p className="mt-1 text-xs text-(--muted)">
        Write what you saw, not what you concluded. Keep factual claims about a business to what you
        witnessed yourself.
      </p>

      {/* Assent: unchecked by default, directly above submit, link inside the label. */}
      <label className="mt-3 flex items-start gap-2 text-sm text-(--dark)">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          I have read and agree to the{" "}
          <a
            href="/contributor-terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--accent) underline"
          >
            Contributor Terms
          </a>
        </span>
      </label>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy || rating < 1 || !agreed}
          className="flex-1 rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Sending…" : "Submit review"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-(--border) px-4 py-2.5 text-sm font-medium text-(--dark)"
        >
          Cancel
        </button>
      </div>

      <p className="mt-2 text-xs text-(--muted)">
        Reviews are read by a person before they appear. Nothing publishes automatically.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-(--river)">
          {error}
        </p>
      )}
    </form>
  );
}
