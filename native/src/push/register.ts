/**
 * Native twin of web lib/push.ts: permission + Expo token + backend
 * registration. The backend rides the same /api/alerts/subscribe endpoint with
 * an { expoToken } payload (see web/lib/subscribe-validation.ts).
 *
 * FAIL-SOFT BY DESIGN: fetching an iOS push token requires the aps-environment
 * entitlement, which needs paid Apple Developer enrollment + an APNs key in
 * EAS, plus an EAS projectId from `eas init`. Until then getExpoPushTokenAsync
 * throws; we return "unsupported" and the enrollment card explains, the app
 * never crashes. See the post-enrollment runbook in docs.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { API_BASE } from "../api/base";

const ANON_KEY = "ptw-anon-id";
const SUBSCRIPTION_KEY = "ptw-push-subscription"; // stores the Expo token
const DENIED_KEY = "ptw-alerts-denied";
const SNOOZE_KEY = "ptw-alerts-snoozed-until";
export const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days, same as web

export type OptInResult = "granted" | "denied" | "unsupported";

export async function getAnonId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const id = Crypto.randomUUID();
    await AsyncStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    return "unknown";
  }
}

export async function readStashedToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SUBSCRIPTION_KEY);
  } catch {
    return null;
  }
}

export async function isSnoozedOrDenied(): Promise<boolean> {
  try {
    const [snooze, denied] = await Promise.all([
      AsyncStorage.getItem(SNOOZE_KEY),
      AsyncStorage.getItem(DENIED_KEY),
    ]);
    if (denied === "1") return true;
    return (Number(snooze) || 0) > Date.now();
  } catch {
    return false;
  }
}

export async function snoozeAlerts(): Promise<void> {
  try {
    await AsyncStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* ignore */
  }
}

export async function markDenied(): Promise<void> {
  try {
    await AsyncStorage.setItem(DENIED_KEY, "1");
  } catch {
    /* ignore */
  }
}

async function postSubscription(expoToken: string, watchedSpotIds: number[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/alerts/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId: await getAnonId(), expoToken, watchedSpotIds }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Ask permission, fetch the Expo token, register with the backend. */
export async function enablePushAlerts(watchedSpotIds: number[]): Promise<OptInResult> {
  if (!Device.isDevice) {
    // Simulators cannot obtain push tokens; treat like an unsupported browser.
    return "unsupported";
  }
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return "denied";

  try {
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return "unsupported"; // eas init not run yet (runbook step)
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const posted = await postSubscription(token, watchedSpotIds);
    if (!posted) return "unsupported";
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, token);
    return "granted";
  } catch {
    // No entitlement / no APNs key yet: permission granted but no token.
    return "unsupported";
  }
}

/** Re-POST the watched set when it changes. No-ops without a subscription. */
export async function syncWatchedSpots(watchedSpotIds: number[]): Promise<void> {
  const token = await readStashedToken();
  if (!token) return;
  await postSubscription(token, watchedSpotIds);
}

/** Durable server-side open ping for an alert tap (same as web reportAlertOpen). */
export function reportAlertOpen(token: string, spotId?: number): void {
  fetch(`${API_BASE}/api/alerts/opened`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...(spotId ? { spot_id: spotId } : {}) }),
  }).catch(() => {});
}

/** Schedule a launch-time reminder via the backend (native remind payload). */
export async function scheduleReminder(args: {
  spotId: number;
  spotName: string;
  windowKey: string;
  fireAt: string;
}): Promise<boolean> {
  const token = await readStashedToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/api/alerts/remind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expoToken: token, ...args }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
