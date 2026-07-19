import { useEffect, useRef } from "react";

/**
 * Native stand-in for web lib/useGenuineView (IntersectionObserver + 1s dwell).
 * Inside the full-screen spot sheet the panel is on screen by construction, so
 * "genuine view" reduces to a dwell: fire once after `dwellMs` mounted, re-armed
 * when `key` changes. Same 1000ms default as the web hook, so the two
 * platforms' `_viewed` events stay comparable.
 */
export function useGenuineDwell({
  key,
  enabled = true,
  onView,
  dwellMs = 1000,
}: {
  key: string | number;
  enabled?: boolean;
  onView: () => void;
  dwellMs?: number;
}): void {
  const firedFor = useRef<string | number | null>(null);
  const onViewRef = useRef(onView);
  useEffect(() => {
    onViewRef.current = onView;
  });

  useEffect(() => {
    if (!enabled || firedFor.current === key) return;
    const t = setTimeout(() => {
      firedFor.current = key;
      onViewRef.current();
    }, dwellMs);
    return () => clearTimeout(t);
  }, [key, enabled, dwellMs]);
}
