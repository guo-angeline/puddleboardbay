"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { setPersona } from "@/lib/analytics";

/**
 * Initializes PostHog once on the client. Renders nothing.
 *
 * Set NEXT_PUBLIC_POSTHOG_KEY (and optionally NEXT_PUBLIC_POSTHOG_HOST) in the
 * environment to enable it. Without the key this is a no-op, so local dev and
 * previews don't pollute analytics.
 */

function isStandalone(): boolean {
  return (
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

/**
 * Traffic that must never reach analytics: automation (navigator.webdriver
 * covers our own Playwright smoke tests), bot user agents PostHog's default
 * blocklist misses, and devices flagged internal via
 * localStorage.setItem("ptw-internal", "1"). Bots are 100% one-and-done, so
 * they inflate the $pageview denominator AND depress every retention cohort.
 */
function isFilteredTraffic(): boolean {
  if (navigator.webdriver) return true;
  if (/bot|crawl|spider|headless|lighthouse|prerender/i.test(navigator.userAgent)) return true;
  try {
    if (localStorage.getItem("ptw-internal") === "1") return true;
  } catch {
    /* private mode: can't read the flag, treat as real traffic */
  }
  return false;
}

export default function PostHogProvider() {
  useEffect(() => {
    // Flag this device as internal by visiting `/?internal=1` once: it sets the
    // `ptw-internal` localStorage flag (read by isFilteredTraffic below), so the
    // device's traffic is filtered from analytics from here on. Much easier than
    // setting localStorage by hand, which is painful on iOS Safari. Runs before
    // the key check so it works regardless; the same visit is then filtered.
    try {
      if (new URLSearchParams(window.location.search).get("internal") === "1") {
        localStorage.setItem("ptw-internal", "1");
      }
    } catch {
      /* private mode: cannot persist the flag */
    }

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;

    const filtered = isFilteredTraffic();
    const displayMode = isStandalone() ? "standalone" : "browser";

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      defaults: "2025-05-24",
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      before_send: (event) => (filtered ? null : event),
    });

    // Super property: every event is segmentable by surface. The iOS PWA runs
    // in a separate storage partition from Safari, so the same human gets a
    // NEW distinct_id after installing; display_mode is how reports see (and
    // caveat) that split. See analytics/GLOSSARY.md "Identity".
    posthog.register({ display_mode: displayMode });

    if (filtered) return; // don't stamp person traits on excluded traffic

    // First-touch acquisition, $set_once so only the first visit ever writes.
    // This intentionally creates a person profile for every visitor (posthog-js
    // defaults to identified_only); logged in INSTRUMENTATION_CHANGELOG 2026-07-09.
    const params = new URLSearchParams(window.location.search);
    const firstTouch: Record<string, unknown> = {
      first_referrer: document.referrer || "direct",
      first_landing_path: window.location.pathname,
      first_display_mode: displayMode,
      first_device_type: window.matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop",
      first_seen_at: new Date().toISOString(),
    };
    for (const p of ["utm_source", "utm_medium", "utm_campaign"] as const) {
      const v = params.get(p);
      if (v) firstTouch[`first_${p}`] = v;
    }
    setPersona({}, firstTouch);
  }, []);

  return null;
}
