"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Device-only viewport diagnostic, gated behind ?vh. Lets the owner screenshot
 * real iOS viewport numbers before any dead-band CSS fix (ROADMAP item 12).
 * Renders nothing (no DOM node at all) unless the URL has ?vh; SSR and the
 * no-param case both render null, so normal rendering is byte-identical.
 */
export default function ViewportDiagnostic() {
  const [enabled, setEnabled] = useState(false);
  const [screenHeight, setScreenHeight] = useState<number | null>(null);
  const [innerHeight, setInnerHeight] = useState<number | null>(null);
  const [visualViewportHeight, setVisualViewportHeight] = useState<number | "unsupported" | null>(null);
  const [safeAreaBottom, setSafeAreaBottom] = useState<string | null>(null);
  const [standalone, setStandalone] = useState(false);
  const probeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(params.has("vh"));
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const readInnerHeight = () => setInnerHeight(window.innerHeight);
    const readVisualViewport = () => {
      setVisualViewportHeight(window.visualViewport ? window.visualViewport.height : "unsupported");
    };
    const readStandalone = () =>
      setStandalone(
        ("standalone" in navigator &&
          (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
          window.matchMedia("(display-mode: standalone)").matches
      );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScreenHeight(window.screen.height);
    readInnerHeight();
    readVisualViewport();
    readStandalone();
    if (probeRef.current) {
      setSafeAreaBottom(getComputedStyle(probeRef.current).paddingBottom);
    }

    window.addEventListener("resize", readInnerHeight);
    window.visualViewport?.addEventListener("resize", readVisualViewport);

    return () => {
      window.removeEventListener("resize", readInnerHeight);
      window.visualViewport?.removeEventListener("resize", readVisualViewport);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-label="Viewport diagnostic"
      className="fixed left-0 z-[9999] rounded-xl px-4 shadow-lg text-white"
      style={{
        top: 0,
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "1rem",
        background: "#0B2A47",
        maxWidth: "min(320px, calc(100vw - 2rem))",
      }}
    >
      <div className="flex flex-col" style={{ gap: "0.25rem" }}>
        <div className="text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>
          VIEWPORT DIAGNOSTIC
        </div>
        <div className="text-sm tabular-nums">display-mode: {standalone ? "standalone" : "browser"}</div>
        <div className="text-sm tabular-nums">screen.height: {screenHeight}px</div>
        <div className="text-sm tabular-nums">window.innerHeight: {innerHeight}px</div>
        <div className="text-sm tabular-nums">
          visualViewport.height: {visualViewportHeight === "unsupported" ? "unsupported" : `${visualViewportHeight}px`}
        </div>
        <div className="text-sm tabular-nums">safe-area-inset-bottom: {safeAreaBottom}</div>
        <div className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Debug only, ?vh required.</div>
      </div>
      {/* Offscreen 0-size probe: only way to read env(safe-area-inset-bottom) from JS */}
      <div ref={probeRef} style={{ paddingBottom: "env(safe-area-inset-bottom)", position: "absolute", width: 0, height: 0, overflow: "hidden" }} />
    </div>
  );
}
