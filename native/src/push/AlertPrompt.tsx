import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { setPersona, trackIntent } from "../lib/analytics";
import { emit, on } from "../state/events";
import { colors, fonts, radius } from "../theme/tokens";
import {
  enablePushAlerts,
  isSnoozedOrDenied,
  markDenied,
  readStashedToken,
  snoozeAlerts,
  type OptInResult,
} from "./register";

type Trigger = "first_save" | "manual" | "conditions_interest";

interface Props {
  /** Current watched spot ids, for the subscribe POST. */
  watchedSpotIds: number[];
}

/**
 * Native enrollment card, the app twin of web InstallPrompt's push path. One
 * channel (native push), so no dual-CTA and no install steps. Triggers ride
 * the event bus exactly like the web rides ptw:* CustomEvents:
 *  - spotsaved       -> first_save (first save while unsubscribed)
 *  - enablealerts    -> manual ("Turn on alerts" in the Watching header;
 *                       bypasses the snooze, like the web)
 *  - conditionsinterest -> 3 distinct spots' conditions genuinely viewed
 * Dismiss = 14-day snooze (never a permanent kill); an OS-level permission
 * denial persists ptw-alerts-denied so relaunches stop re-offering.
 */
export default function AlertPrompt({ watchedSpotIds }: Props) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [trigger, setTrigger] = useState<Trigger>("first_save");
  const [spotName, setSpotName] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [result, setResult] = useState<OptInResult | null>(null);
  const shownLogged = useRef<Trigger | null>(null);
  const watchedRef = useRef(watchedSpotIds);
  useEffect(() => {
    watchedRef.current = watchedSpotIds;
  });

  useEffect(() => {
    async function offer(t: Trigger, name?: string, bypassSnooze = false) {
      if (await readStashedToken()) return; // already subscribed
      if (!bypassSnooze && (await isSnoozedOrDenied())) return;
      setTrigger(t);
      if (name) setSpotName(name);
      setResult(null);
      setVisible(true);
    }
    const offs = [
      on("spotsaved", ({ spotName: name }) => {
        void offer("first_save", name);
      }),
      on("enablealerts", () => {
        void offer("manual", undefined, true);
      }),
      on("conditionsinterest", () => {
        void offer("conditions_interest");
      }),
      on("alertsenabled", () => setVisible(false)),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    if (!visible || shownLogged.current === trigger) return;
    shownLogged.current = trigger;
    trackIntent("alert_optin_shown", { platform: "native_ios", trigger, channel: "push" });
  }, [visible, trigger]);

  function handleDismiss() {
    void snoozeAlerts();
    trackIntent("alert_optin_dismissed", { platform: "native_ios", trigger, channel: "push" });
    setVisible(false);
  }

  async function handleEnable() {
    if (enabling) return;
    setEnabling(true);
    const r = await enablePushAlerts(watchedRef.current);
    setEnabling(false);
    setResult(r);
    trackIntent("alert_optin_result", { platform: "native_ios", result: r });
    if (r === "granted") {
      setPersona({ alerts_enabled: true });
      emit("alertsenabled");
      setTimeout(() => setVisible(false), 1600);
    } else if (r === "denied") {
      void markDenied();
    }
  }

  if (!visible) return null;

  const headline =
    result === "granted"
      ? "You're set."
      : trigger === "first_save" && spotName
        ? `Get alerts when ${spotName} is good to paddle`
        : "Get alerts when your spots are good to paddle";
  const sub =
    result === "granted"
      ? "We'll ping you when your spots are good to paddle."
      : "One ping when a spot you watch gets a calm window.";

  return (
    <View
      style={[styles.wrap, { bottom: Math.max(16, insets.bottom + 8) }]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <Pressable
          onPress={handleDismiss}
          style={styles.close}
          hitSlop={10}
          accessibilityLabel="Dismiss"
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.sub}>{sub}</Text>
        {result !== "granted" && (
          <>
            <Pressable
              onPress={handleEnable}
              disabled={enabling}
              style={[styles.enableButton, enabling && { opacity: 0.7 }]}
            >
              <Text style={styles.enableText}>{enabling ? "Turning on..." : "Turn on push"}</Text>
            </Pressable>
            {result === "denied" && (
              <Text style={styles.errorLine}>
                Notifications are off for this app. Turn them on in Settings, then try again.
              </Text>
            )}
            {result === "unsupported" && (
              <Text style={styles.errorLine}>
                Push isn&rsquo;t available in this build yet. Conditions still update every time
                you open the app.
              </Text>
            )}
          </>
        )}
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
    zIndex: 40,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0B2A47",
    shadowOpacity: 0.14,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  close: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  closeText: {
    fontSize: 20,
    color: colors.inkMuted,
    lineHeight: 22,
  },
  headline: {
    fontFamily: fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.dark,
    paddingRight: 28,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 4,
  },
  enableButton: {
    marginTop: 12,
    width: "100%",
    paddingVertical: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  enableText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.white,
  },
  errorLine: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.windAlert,
  },
});
