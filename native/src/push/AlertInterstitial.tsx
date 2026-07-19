import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { GoodWindow } from "@/lib/alerts/conditions-window";
import { launchDirectionTip } from "@/lib/launchDirection";
import { getNextWindow, windowDay, windowRange } from "@/lib/nextWindow";
import type { Spot } from "@/lib/types";
import { trackIntent } from "../lib/analytics";
import { colors, fonts, radius } from "../theme/tokens";
import { scheduleReminder } from "./register";

/** Epoch ms of the window open (Pacific local), or null if already open. */
function reminderFireMs(w: GoodWindow, nowMs: number): number | null {
  const [y, m, d] = w.windowKey.split("-").map(Number);
  const start = new Date(y, m - 1, d, w.startHour, 0, 0).getTime();
  return start > nowMs ? start : null;
}

interface Props {
  spot: Spot;
  windowLabel: string;
  onDismiss: () => void;
}

type Status = "idle" | "setting" | "done" | "error";

/**
 * Native twin of the web AlertInterstitial: floating azure card over the
 * deep-linked spot's sheet after a push tap, repeating the window timing and
 * offering a launch-time reminder.
 */
export default function AlertInterstitial({ spot, windowLabel, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>("idle");
  const [win, setWin] = useState<{ window: GoodWindow; fireMs: number | null } | null>(null);
  const shownLogged = useRef(false);

  useEffect(() => {
    let alive = true;
    getNextWindow(spot.id, spot.lat, spot.lng).then((r) => {
      if (!alive) return;
      if (r.ok && r.window) setWin({ window: r.window, fireMs: reminderFireMs(r.window, Date.now()) });
      if (!shownLogged.current) {
        shownLogged.current = true;
        const tipShown =
          r.ok && !!r.window && launchDirectionTip(r.window.windDirection, r.window.maxWindMph) !== null;
        trackIntent("alert_interstitial_shown", {
          spot_id: spot.id,
          launch_tip_shown: tipShown,
        });
      }
    });
    return () => {
      alive = false;
    };
  }, [spot.id, spot.lat, spot.lng]);

  const nextWindow = win?.window ?? null;
  const fireMs = win?.fireMs ?? null;
  const day = nextWindow ? windowDay(nextWindow) : null;
  const range = nextWindow ? windowRange(nextWindow) : null;
  const canRemind = nextWindow != null && fireMs != null;
  const tip = nextWindow ? launchDirectionTip(nextWindow.windDirection, nextWindow.maxWindMph) : null;

  const title = day ? `${spot.water} looks good ${day}` : `${spot.water} has a good window`;
  const subline = range ? `${range}, per the forecast.` : `${windowLabel}, per the forecast.`;

  function handleDismiss() {
    trackIntent("alert_interstitial_result", { spot_id: spot.id, outcome: "dismissed" });
    onDismiss();
  }

  async function handleRemind() {
    if (!nextWindow || fireMs == null || status === "setting" || status === "done") return;
    setStatus("setting");
    trackIntent("alert_interstitial_result", { spot_id: spot.id, outcome: "reminder" });
    const ok = await scheduleReminder({
      spotId: spot.id,
      spotName: spot.water,
      windowKey: nextWindow.windowKey,
      fireAt: new Date(fireMs).toISOString(),
    });
    setStatus(ok ? "done" : "error");
  }

  const ctaLabel =
    status === "setting"
      ? "Setting reminder..."
      : status === "error"
        ? "Could not set reminder, tap to retry"
        : "Remind me when the window opens";

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>A SPOT YOU WATCH</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subline}>{subline}</Text>
            {tip && <Text style={styles.subline}>{tip}</Text>}
            {/* Canonical safety line, verbatim from ConditionsPanel. */}
            <Text style={styles.safety}>
              Guidance only, not a safety guarantee. Conditions shift fast on the water.
            </Text>
          </View>
          <Pressable onPress={handleDismiss} hitSlop={10} accessibilityLabel="Dismiss">
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>
        {canRemind &&
          (status === "done" ? (
            <Text style={styles.doneLine}>
              Reminder set. We&rsquo;ll ping you when the window opens.
            </Text>
          ) : (
            <Pressable
              onPress={handleRemind}
              disabled={status === "setting"}
              style={[styles.remindButton, status === "setting" && { opacity: 0.7 }]}
            >
              <Text style={styles.remindText}>{ctaLabel}</Text>
            </Pressable>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 30,
  },
  card: {
    width: "100%",
    maxWidth: 384,
    borderRadius: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  kicker: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: "rgba(255, 255, 255, 0.7)",
  },
  title: {
    fontFamily: fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.white,
    marginTop: 2,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },
  safety: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 6,
  },
  close: {
    fontSize: 22,
    lineHeight: 24,
    color: "rgba(255, 255, 255, 0.7)",
  },
  doneLine: {
    marginTop: 12,
    textAlign: "center",
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 10,
  },
  remindButton: {
    marginTop: 12,
    width: "100%",
    paddingVertical: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    alignItems: "center",
  },
  remindText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.accent,
  },
});
