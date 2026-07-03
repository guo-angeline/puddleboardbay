/**
 * Client-side Web Push helpers for the conditions-alert retention loop (Stage B).
 * No backend yet: a successful subscription is stashed in localStorage as the
 * seam Stage C will read and POST to /api/alerts/subscribe.
 */

import { trackSystem } from "@/lib/analytics";

const STASH_KEY = "ptw-push-subscription";
const ANON_KEY = "ptw-anon-id";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Convert a base64url VAPID public key into the Uint8Array applicationServerKey wants. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export interface StashedSubscription {
  subscription: PushSubscriptionJSON;
  watchedSpotIds: number[];
  stashedAt: number;
}

export function stashSubscription(sub: PushSubscription, watchedSpotIds: number[]): void {
  try {
    const payload: StashedSubscription = {
      subscription: sub.toJSON(),
      watchedSpotIds,
      stashedAt: Date.now(),
    };
    localStorage.setItem(STASH_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota: a missing stash just means re-subscribe later */
  }
}

export function readStashedSubscription(): StashedSubscription | null {
  try {
    const raw = localStorage.getItem(STASH_KEY);
    return raw ? (JSON.parse(raw) as StashedSubscription) : null;
  } catch {
    return null;
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export type OptInResult = "granted" | "denied" | "unsupported";

/**
 * Request notification permission and create a push subscription. On success the
 * subscription + watched ids are stashed locally (Stage C will POST them).
 * Returns the outcome so the caller can log it and show the right message.
 */
export async function enablePushAlerts(watchedSpotIds: number[]): Promise<OptInResult> {
  if (!isPushSupported()) return "unsupported";
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration | null>((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);
  if (!reg) return "unsupported";
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  stashSubscription(sub, watchedSpotIds);
  await postSubscription(sub, watchedSpotIds);
  return "granted";
}

/** Stable anonymous device id, generated once and persisted. */
export function getAnonId(): string {
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    // Storage unavailable: a fresh id each call is acceptable degradation.
    return crypto.randomUUID();
  }
}

/** POST the subscription + watched ids to the backend. Best-effort; returns success. */
export async function postSubscription(
  sub: PushSubscription | PushSubscriptionJSON,
  watchedSpotIds: number[]
): Promise<boolean> {
  const subscription = "toJSON" in sub ? sub.toJSON() : sub;
  try {
    const res = await fetch("/api/alerts/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonId: getAnonId(), subscription, watchedSpotIds }),
    });
    if (!res.ok) {
      trackSystem("alert_subscribe_failed", { status: res.status, watched_count: watchedSpotIds.length });
    }
    return res.ok;
  } catch {
    trackSystem("alert_subscribe_failed", { status: null, watched_count: watchedSpotIds.length });
    return false;
  }
}

/** Re-sync watched ids if this device already has a stashed subscription. */
export async function syncWatchedSpots(watchedSpotIds: number[]): Promise<void> {
  const stashed = readStashedSubscription();
  if (!stashed) return;
  await postSubscription(stashed.subscription, watchedSpotIds);
}
