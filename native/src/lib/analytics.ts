/**
 * TEMPORARY no-op analytics shims, replaced in M7 by the real
 * posthog-react-native wrapper sharing the typed event unions with
 * web/lib/analytics.ts. Call sites are written against the final signatures so
 * M7 is a drop-in swap, not a sweep.
 */
type Props = Record<string, unknown>;

export function trackIntent(_event: string, _props: Props = {}): void {}

export function trackSystem(_event: string, _props: Props = {}): void {}

export function setPersona(_props: Props): void {}
