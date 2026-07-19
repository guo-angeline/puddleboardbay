/**
 * Native PostHog emitter over the SHARED event contracts in
 * web/lib/analytics-events.ts, the app twin of web/lib/analytics.ts. Event
 * names and prop shapes are identical across platforms by construction; the
 * platforms segment via the `display_mode` super property ("native_ios" here).
 *
 * No-key = no-op, same as web: the key rides EXPO_PUBLIC_POSTHOG_KEY (inlined
 * by Expo at bundle time from native/.env, gitignored). Owner-device exclusion:
 * the `ptw-internal` AsyncStorage flag drops every capture client-side
 * (posthog-react-native has no before_send hook; the wrapper is the gate).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import PostHog from "posthog-react-native";

import type {
  IntentEventName,
  PropsFor,
  SystemEventName,
} from "@/lib/analytics-events";

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const INTERNAL_KEY = "ptw-internal";

let client: PostHog | null = null;
let internal = false;

export function getPostHog(): PostHog | null {
  return client;
}

/** Call once at app start (before the first screen renders events). */
export function initAnalytics(): void {
  if (client || !KEY) return;
  client = new PostHog(KEY, { host: HOST });
  // Super props: every event carries the surface, like the web's display_mode.
  client.register({ display_mode: "native_ios" });
  void AsyncStorage.getItem(INTERNAL_KEY).then((v) => {
    internal = v === "1";
  });
}

/** Owner/internal device: flips ptw-internal and drops all future captures. */
export async function setInternalDevice(on: boolean): Promise<void> {
  internal = on;
  try {
    await AsyncStorage.setItem(INTERNAL_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function isInternalDevice(): boolean {
  return internal;
}

type CaptureProps = NonNullable<Parameters<PostHog["capture"]>[1]>;

function capture(event: string, props: Record<string, unknown>): void {
  if (!client || internal) return;
  // The shared EventPropMap values are all JSON-serializable; the cast bridges
  // its `unknown` prop bags to posthog's JsonType index signature.
  client.capture(event, props as CaptureProps);
}

/** Emit a SYSTEM/availability event (auto-fired on data settling). */
export function trackSystem<E extends SystemEventName>(event: E, props: PropsFor<E>): void {
  capture(event, { ...props, event_category: "system" });
}

/** Emit an INTENT/engagement event (a deliberate act or dwell-gated view). */
export function trackIntent<E extends IntentEventName>(event: E, props: PropsFor<E>): void {
  capture(event, { ...props, event_category: "intent" });
}

/** Durable person properties (cohorts/personas), same semantics as web. */
export function setPersona(
  set: Record<string, unknown>,
  setOnce?: Record<string, unknown>
): void {
  if (!client || internal) return;
  client.capture(
    "$set",
    { $set: set, ...(setOnce ? { $set_once: setOnce } : {}) } as CaptureProps
  );
}
