import { useEffect, useState } from "react";

import { getPostHog } from "./analytics";

/**
 * Native port of web lib/experiments.ts useKillSwitch: a reversibility flag,
 * not an A/B. Default ON; the feature hides only when PostHog explicitly
 * resolves the flag to false/"control". PostHog unreachable, key missing, or
 * flags not yet loaded all mean ON, so a user who blocks analytics still gets
 * every feature.
 */
export function useKillSwitch(flag: string): boolean {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const ph = getPostHog();
    if (!ph) return;
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const v = ph.getFeatureFlag(flag);
      setDisabled(v === false || v === "control");
    };
    check();
    const off = ph.onFeatureFlags(check);
    return () => {
      cancelled = true;
      off?.();
    };
  }, [flag]);

  return !disabled;
}
