"use client";

import { useCallback, useEffect, useRef } from "react";

interface Options {
  /** Re-arms the one-shot when this changes (e.g. a different spot opens). */
  key: string | number;
  /** Called once when the element has been genuinely viewed. */
  onView: () => void;
  /** Skip observing entirely when false. */
  enabled?: boolean;
  /** Continuous-visibility time before it counts as a view. */
  dwellMs?: number;
  /** Fraction of the element that must be visible. */
  threshold?: number;
}

/**
 * Fire `onView` once after the observed element has been continuously visible in
 * the viewport (>= `threshold`) for `dwellMs`. This is what makes a `_viewed`
 * event mean a human actually looked, not merely that data loaded — the fix for
 * `conditions_viewed` firing on every fetch settle.
 *
 * Re-arms when `key` changes. Pauses the dwell timer while the tab is hidden
 * (conservative: a backgrounded tab never accrues view time). No-ops on SSR,
 * when IntersectionObserver is unavailable, or when `enabled` is false.
 *
 * Returns a ref callback to attach to the element you want to measure.
 */
export function useGenuineView({
  key,
  onView,
  enabled = true,
  dwellMs = 1000,
  threshold = 0.5,
}: Options) {
  const elRef = useRef<Element | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedForKey = useRef<string | number | null>(null);
  // Keep the latest onView without re-subscribing the observer each render.
  const onViewRef = useRef(onView);
  useEffect(() => {
    onViewRef.current = onView;
  });

  useEffect(() => {
    if (!enabled) return;
    if (typeof IntersectionObserver === "undefined") return;
    const el = elRef.current;
    if (!el) return;

    // A fresh key is a fresh chance to register a view.
    firedForKey.current = null;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const fire = () => {
      if (firedForKey.current === key) return;
      firedForKey.current = key;
      clearTimer();
      observer.disconnect();
      onViewRef.current();
    };

    const startDwell = () => {
      if (firedForKey.current === key || timerRef.current) return;
      timerRef.current = setTimeout(fire, dwellMs);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && document.visibilityState === "visible") startDwell();
        else clearTimer();
      },
      { threshold }
    );
    observer.observe(el);

    const onVisibility = () => {
      if (document.visibilityState !== "visible") clearTimer();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimer();
      observer.disconnect();
    };
  }, [enabled, key, dwellMs, threshold]);

  return useCallback((node: Element | null) => {
    elRef.current = node;
  }, []);
}
