"use client";

import { useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import type { GoodWindow } from "@/lib/alerts/conditions-window";
import { trackIntent } from "@/lib/analytics";
import { getNextWindow, windowDay, windowRange } from "@/lib/nextWindow";

interface Props {
  spot: Spot;
  windowLabel: string;
  onDismiss: () => void;
}

const LEAD_MIN = 30; // fire the reminder this many minutes before the window opens

/**
 * When to push the reminder: the window start, in the user's local time (the
 * audience and the spots share the Pacific timezone), minus the lead. Returns
 * epoch ms. `null` if the launch is already within the lead (nothing to remind).
 */
function reminderFireMs(w: GoodWindow, nowMs: number): number | null {
  const [y, m, d] = w.windowKey.split("-").map(Number);
  const start = new Date(y, m - 1, d, w.startHour, 0, 0).getTime();
  const fire = start - LEAD_MIN * 60_000;
  return fire > nowMs ? fire : null;
}

/**
 * Floating card over the deep-linked spot's drawer, shown whenever the app
 * opened from a push alert. A personal update about the user's saved spot:
 * which spot is good and exactly when. The alert is about a FUTURE window, so
 * the action is "remind me at launch time", which schedules a push notification
 * ~30 min before the window opens (server-side; see /api/alerts/remind and
 * /api/cron/send-reminders, per DECISIONS D4). Put-in details live in the drawer
 * below and are not repeated here.
 *
 * Monitored 100% rollout (D2(a)). Mount is gated on the alert context in
 * HomeClient, so this renders unconditionally.
 */
export default function AlertInterstitial({ spot, windowLabel, onDismiss }: Props) {
  useEffect(() => {
    trackIntent("alert_interstitial_shown", { spot_id: spot.id });
  }, [spot.id]);

  // Resolve the window and compute the fire time together in the effect (Date.now
  // is impure, so it must not run during render). fireMs is null when the launch
  // is already within the lead, i.e. there's nothing left to remind about.
  const [win, setWin] = useState<{ window: GoodWindow; fireMs: number | null } | null>(null);
  useEffect(() => {
    let alive = true;
    getNextWindow(spot.id, spot.lat, spot.lng).then((r) => {
      if (alive && r.ok && r.window) setWin({ window: r.window, fireMs: reminderFireMs(r.window, Date.now()) });
    });
    return () => {
      alive = false;
    };
  }, [spot.id, spot.lat, spot.lng]);

  const [status, setStatus] = useState<"idle" | "setting" | "done" | "error">("idle");

  const nextWindow = win?.window ?? null;
  const fireMs = win?.fireMs ?? null;
  const day = nextWindow ? windowDay(nextWindow) : null;
  const range = nextWindow ? windowRange(nextWindow) : null;
  const canRemind = nextWindow != null && fireMs != null;

  const title = day ? `${spot.water} looks good ${day}` : `${spot.water} has a good window`;
  const subline = range ? `Calm window ${range}.` : `${windowLabel}.`;

  function handleDismiss() {
    trackIntent("alert_interstitial_result", { spot_id: spot.id, outcome: "dismissed" });
    onDismiss();
  }

  async function handleRemind() {
    if (!nextWindow || fireMs == null || status === "setting" || status === "done") return;
    setStatus("setting");
    trackIntent("alert_interstitial_result", { spot_id: spot.id, outcome: "reminder" });
    try {
      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) {
        setStatus("error");
        return;
      }
      const res = await fetch("/api/alerts/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          spotId: spot.id,
          spotName: spot.water,
          windowKey: nextWindow.windowKey,
          fireAt: new Date(fireMs).toISOString(),
        }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  const ctaLabel =
    status === "setting" ? "Setting reminder..." : status === "error" ? "Could not set reminder, tap to retry" : "Remind me at launch time";

  return (
    <div
      className="fixed inset-x-0 top-0 flex justify-center px-4"
      style={{ zIndex: 1300, paddingTop: "calc(max(0.75rem, env(safe-area-inset-top)) + 0.5rem)" }}
    >
      <div className="w-full max-w-sm rounded-2xl shadow-2xl px-4 py-3.5" style={{ background: "var(--accent)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Your saved spot</p>
            <p className="font-['Newsreader'] text-white text-base font-bold leading-tight mt-0.5">{title}</p>
            <p className="text-white/85 text-sm mt-0.5">{subline}</p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 -mt-1.5 -mr-1.5 flex h-11 w-11 items-center justify-center text-white/70 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
        {canRemind &&
          (status === "done" ? (
            <p className="mt-3 flex items-center justify-center w-full py-2.5 text-sm font-semibold text-white/90">
              Reminder set. We&apos;ll ping you when it&apos;s time to launch.
            </p>
          ) : (
            <button
              onClick={handleRemind}
              disabled={status === "setting"}
              className="mt-3 flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-semibold bg-white transition-opacity hover:opacity-90 disabled:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              {ctaLabel}
            </button>
          ))}
      </div>
    </div>
  );
}
