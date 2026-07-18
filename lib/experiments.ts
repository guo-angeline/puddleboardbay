"use client";

import { useCallback, useEffect, useState } from "react";
import posthog from "posthog-js";
import { trackIntent } from "@/lib/analytics";

/**
 * Minimal, correct experimentation layer over PostHog feature flags.
 *
 * Two correctness rules baked in:
 * 1. Exposure = the treatment actually rendered, not that the user was bucketed.
 *    Call `logExposure()` from a useEffect INSIDE the rendered variant branch.
 *    Reports join metrics against `experiment_exposed`, so a user who never saw
 *    the variant never dilutes the result.
 * 2. Bucketing is keyed on the anonymous distinct_id (localStorage+cookie, see
 *    components/PostHogProvider.tsx). The app has no login, so NEVER call
 *    posthog.identify() or posthog.reset() — either reshuffles every running
 *    experiment.
 *
 * Each experiment declares its flag, variants, primary metric, and guardrails in
 * one place (EXPERIMENTS) so analysis and the experiment doc stay in sync. See
 * docs/experiments/TEMPLATE.md before launching one.
 */

export interface ExperimentDef {
  /** PostHog feature flag key. */
  flag: string;
  /** Allowed variants; variants[0] is the control / fallback. */
  variants: readonly string[];
  /** The single event name that decides success. */
  primaryMetric: string;
  /** Event names that must not regress while the test runs. */
  guardrails: readonly string[];
}

export const EXPERIMENTS = {
  // Inactive until the flag is created in PostHog and a treatment is wired into
  // the UI. Seeds ROADMAP item 2 — make "Get Directions" convert by testing
  // button placement in the spot drawer.
  directions_placement: {
    flag: "directions-placement",
    variants: ["control", "top"],
    primaryMetric: "spot_action",
    guardrails: ["conditions_loaded", "spot_sheet_dismissed"],
  },
  // NOTE: alert_interstitial was retired as an A/B test on 2026-07-08 (D2(a)).
  // It fired only on push-opens with a tiny watched set, so an arm comparison
  // could never reach significance; it now ships as a monitored 100% rollout
  // (the card always renders, watch `spot_sheet_dismissed`/`conditions_loaded`
  // for regressions). See components/AlertInterstitial.tsx and
  // docs/experiments/alert-interstitial.md.
  //
  // ROADMAP retention loop: preview the paid multi-day window in-drawer, ahead
  // of the PaddlePass paywall, to see if a forward-looking "come back Sat"
  // window gives people a reason to plan a return paddle.
  next_good_window: {
    flag: "next-good-window",
    variants: ["control", "treatment"],
    primaryMetric: "spot_action",
    guardrails: ["conditions_loaded", "spot_sheet_dismissed"],
  },
  // Item 32: control is the current single-lead enrollment card (push-led on
  // Android/standalone, email-led on iOS/desktop). Treatment is the
  // equal-weight push + "or" + email dual-CTA card. Defaults to control so
  // production is undisturbed during the mid-July retention read.
  enrollment_dual_cta: {
    flag: "enrollment-dual-cta",
    variants: ["control", "treatment"],
    primaryMetric: "alert_optin_result",
    guardrails: ["email_capture_submitted", "alert_optin_dismissed"],
  },
  // NOTE: owner_rating (item 39) was removed here 2026-07-17 (D20). The owner
  // directed it to 100%, so it no longer needs an experiment: it renders
  // unconditionally in SpotDrawer whenever a spot has a rating. Gating editorial
  // content on a PostHog flag would have hidden it from anyone who blocks
  // analytics. `spot_action` still carries owner_rating + owner_rating_shown for
  // engagement analysis. See docs/experiments/owner-rating.md.
} as const satisfies Record<string, ExperimentDef>;

export type ExperimentName = keyof typeof EXPERIMENTS;
type VariantOf<N extends ExperimentName> = (typeof EXPERIMENTS)[N]["variants"][number];

// Once-per-session-per-experiment exposure guard (module-level survives renders).
const exposed = new Set<string>();

function resolveVariant<N extends ExperimentName>(name: N): VariantOf<N> {
  const def = EXPERIMENTS[name];
  const control = def.variants[0] as VariantOf<N>;
  const raw = posthog.getFeatureFlag(def.flag);
  if (typeof raw === "string" && (def.variants as readonly string[]).includes(raw)) {
    return raw as VariantOf<N>;
  }
  return control;
}

/**
 * Imperative, non-hook read for branching logic OUTSIDE React. Does NOT log
 * exposure — reading a flag to branch logic is not the user seeing a treatment.
 */
export function getVariant<N extends ExperimentName>(name: N): VariantOf<N> {
  return resolveVariant(name);
}

/**
 * A 100%-on KILL SWITCH (not an A/B). Returns true by default and flips to false
 * only if PostHog explicitly disables `flag`. A content surface must never wait
 * on PostHog to render (analytics-blockers would lose it, per D20), so the
 * default is ON: this only ever HIDES the feature on an explicit kill, letting
 * us pull a shipped-at-100% surface without a redeploy if a guardrail regresses.
 */
export function useKillSwitch(flag: string): boolean {
  const [killed, setKilled] = useState(false);
  useEffect(() => {
    // isFeatureEnabled is boolean once flags load, undefined before; only an
    // explicit `false` kills. onFeatureFlags fires immediately if already loaded.
    const unsubscribe = posthog.onFeatureFlags(() => {
      setKilled(posthog.isFeatureEnabled(flag) === false);
    });
    return unsubscribe;
  }, [flag]);
  return !killed;
}

/**
 * Reactive variant for rendering. `ready` is false until flags load — render
 * control until then so a flash-of-control isn't mis-counted as exposure. Call
 * `logExposure()` from a useEffect inside the rendered variant branch.
 */
export function useExperiment<N extends ExperimentName>(name: N): {
  variant: VariantOf<N>;
  ready: boolean;
  logExposure: () => void;
} {
  const control = EXPERIMENTS[name].variants[0] as VariantOf<N>;
  const [ready, setReady] = useState(false);
  const [variant, setVariant] = useState<VariantOf<N>>(control);

  useEffect(() => {
    // Fires once flags are available (immediately if already loaded) and again
    // on any later change.
    const unsubscribe = posthog.onFeatureFlags(() => {
      setVariant(resolveVariant(name));
      setReady(true);
    });
    return unsubscribe;
  }, [name]);

  const logExposure = useCallback(() => {
    if (!ready) return;
    const guardKey = `${name}:${variant}`;
    if (exposed.has(guardKey)) return;
    exposed.add(guardKey);
    trackIntent("experiment_exposed", { experiment: name, variant });
  }, [name, variant, ready]);

  return { variant, ready, logExposure };
}
