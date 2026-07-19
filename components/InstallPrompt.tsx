"use client";

import { useEffect, useRef, useState } from "react";
import { trackIntent, trackSystem, setPersona } from "@/lib/analytics";
import { enablePushAlerts, readStashedSubscription, getAnonId, type OptInResult } from "@/lib/push";
import { isValidEmail } from "@/lib/email/validation";
import { isEmailConfirmed, wasReconciledThisSession } from "@/lib/email/subscriptionState";
import {
  RESEND_COOLDOWN_MS,
  RESEND_SPAM_LINE,
  RESEND_LABEL,
  RESEND_SENDING_LABEL,
  RESEND_SENT_NOTE,
  RESEND_CONFIRMED_NOTE,
  RESEND_FAILED_NOTE,
  submitEmailCapture,
} from "@/lib/email/capture";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    "ptw:spotsaved": CustomEvent<{ spotName: string }>;
  }
}

// Set when the OS permission is hard-denied, so a standalone relaunch does not
// re-offer alerts to someone who already said no at the browser level (item 14).
const DENIED_KEY = "ptw-alerts-denied";
// Item 15: dismiss is a SNOOZE, not a permanent kill. It writes a timestamp
// here; the prompt stays quiet until it passes, then may re-offer. This replaces
// the old permanent `ptw-install-dismissed` flag (which killed the funnel
// forever with no way back). An explicit tap on the always-available "Turn on
// alerts" entry point (SpotList) bypasses the snooze.
const SNOOZE_KEY = "ptw-alerts-snoozed-until";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function snoozedUntil(): number {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY)) || 0;
  } catch {
    return 0;
  }
}

// Item 67: cap the return_session re-offer. Before this it had no per-session
// guard and no show-based back-off, so it re-nagged on every qualifying pageload
// (one user saw it 31 times). Two layers: (1) `returnSessionShownThisSession`, a
// module flag mirroring ConditionsPanel's `conditionsInterestFired`, resets on
// full reload, so it shows at most once per session even if the [platform]
// effect re-runs; (2) a persistent back-off written WHEN SHOWN (not only on
// dismiss), so a user who ignores the card without tapping dismiss is not
// re-offered again for RETURN_BACKOFF_MS. Scoped to return_session, its own key,
// so it never suppresses the other triggers.
let returnSessionShownThisSession = false;
const RETURN_BACKOFF_KEY = "ptw-return-offered-until";
const RETURN_BACKOFF_MS = 14 * 24 * 60 * 60 * 1000; // 14 days between re-offers
function returnOfferedUntil(): number {
  try {
    return Number(localStorage.getItem(RETURN_BACKOFF_KEY)) || 0;
  } catch {
    return 0;
  }
}
// One pwa_installed per device, however the install happened (in-app button,
// browser menu, or iOS Add to Home Screen detected on first standalone launch).
// v2: the v1 build (live ~30 min on 2026-07-02) set the flag while the event
// was dropped pre-PostHog-init; the bump lets those devices log once for real.
const INSTALL_LOGGED_KEY = "ptw-install-logged-v2";

function logInstallOnce(outcome: "appinstalled" | "detected_standalone") {
  try {
    if (localStorage.getItem(INSTALL_LOGGED_KEY) === "1") return;
    localStorage.setItem(INSTALL_LOGGED_KEY, "1");
  } catch {
    /* private mode: still log, at worst once per session */
  }
  trackIntent("pwa_installed", { platform: isIOS() ? "ios" : "android", outcome });
  setPersona({ installed_pwa: true });
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Desktop = not a phone/tablet UA. Desktop leads with EMAIL (item 23): desktop
// PWA install is near-useless and desktop push is rarely seen, but a paddler
// planning at a desk is the ideal email recipient. This holds even if the browser
// is technically installable (Chrome desktop fires beforeinstallprompt).
function isDesktopUA() {
  return !/(iphone|ipad|ipod|android|mobile)/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function readFavoriteIds(): number[] {
  try {
    return JSON.parse(localStorage.getItem("ptw-favorites") || "[]") as number[];
  } catch {
    return [];
  }
}

// standalone = installed (can enable push now); ios/android = needs install first;
// desktop = leads with email (item 23).
type Platform = "standalone" | "ios" | "android" | "desktop" | null;

// The five moments that can offer enrollment. Named here (was an inline union
// on the trigger useState) so item 47's suppression sweep has one type to walk.
type Trigger = "first_save" | "standalone_relaunch" | "manual" | "return_session" | "conditions_interest";

// Which channel the enrollment card leads with, per the item-23 matrix: desktop
// and iOS Safari lead with email; a push-denied installed user gets the email
// rescue; everyone else leads with push.
function leadChannel(platform: Platform, result: OptInResult | null): "push" | "email" {
  if (platform === "desktop" || platform === "ios") return "email";
  if (platform === "standalone") return result === "denied" ? "email" : "push";
  return "push"; // android / null
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [spotName, setSpotName] = useState("this spot");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [result, setResult] = useState<OptInResult | null>(null);
  const [trigger, setTrigger] = useState<Trigger>("first_save");
  // Item 47: a confirmed email subscriber who reaches the manual entry point
  // sees a static "You're set." card instead of the channel picker (D18 Q2(c)
  // let the "Turn on alerts" button hide, so this is the defensive path for a
  // stale DOM or a future caller of ptw:enablealerts, not the common case).
  const [youreSet, setYoureSet] = useState(false);
  // Email capture (item 23). `email` is the field; `emailResult` is the outcome
  // ("pending" = confirm mail sent, awaiting the double-opt-in click). `altChannel`
  // toggles the secondary channel: on iOS it reveals the install steps, on Android
  // it reveals the email form (install stays the default there).
  const [email, setEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailResult, setEmailResult] = useState<"pending" | "failed" | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [altChannel, setAltChannel] = useState(false);
  // Resend control on the pending card (item 24): lets the user re-trigger the
  // confirm email if it did not land, with a client cooldown so one tap cannot
  // spam the resend endpoint.
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "confirmed" | "failed">("idle");
  const [resendCooling, setResendCooling] = useState(false);
  // Item 32: dual-CTA enrollment card (push + email at equal weight on mobile
  // surfaces). Shipped at 100% (no A/B flag) 2026-07-17: the enrollment card is
  // shown ~once per 8 days ex-owner, so an arm comparison could never reach
  // significance (owner directive: no A/B until DAU > 100). Retired the same way
  // as alert_interstitial (D2a) and owner_rating (D20).

  // Item 47: a mirror of `platform` readable inside effects that only run once
  // ([] deps: onSaved, the manual entry point, conditions-interest), where
  // reading `platform` directly would close over the initial null.
  const platformRef = useRef<Platform>(null);
  useEffect(() => {
    platformRef.current = platform;
  }, [platform]);

  // Item 47: dedupes enrollment_prompt_suppressed per trigger per pageload.
  // Without it the return_session gate (a useEffect keyed on [platform], which
  // changes up to twice per load) would count renders instead of suppressions.
  const suppressedRef = useRef(new Set<Trigger>());

  // Item 47: the one gate every enrollment surface routes through. Confirmed
  // email subscribers should never be re-offered email (D18), so this returns
  // true and fires the suppression guardrail exactly once per trigger per load.
  function suppressedByEmail(trigger: Trigger, platform: Platform | "standalone"): boolean {
    if (!isEmailConfirmed()) return false;
    if (!suppressedRef.current.has(trigger)) {
      suppressedRef.current.add(trigger);
      trackSystem("enrollment_prompt_suppressed", {
        trigger,
        platform: platform ?? "unknown",
        reconciled_this_session: wasReconciledThisSession(),
      });
    }
    return true;
  }

  // Track whether a spot drawer is open. We no longer HIDE for it (that suppressed
  // the prompt at the exact moment it's earned, since the primary "Save this spot"
  // button now lives inside the drawer, item 13); instead we move to the top so we
  // clear the drawer's bottom Save/Share actions. The old "cover Get Directions"
  // concern is moot: Get Directions was demoted to a secondary row (item 11).
  useEffect(() => {
    const sync = () => setDrawerOpen(document.body.dataset.drawerOpen === "true");
    sync();
    window.addEventListener("ptw:drawerchange", sync);
    return () => window.removeEventListener("ptw:drawerchange", sync);
  }, []);

  // Detect platform once. Does NOT auto-show; the prompt now appears on first save.
  useEffect(() => {
    if (isInStandaloneMode()) {
      setPersona({ installed_pwa: true });
      // iOS installs happen outside the page (Share > Add to Home Screen), so
      // the first standalone launch is the only place we can observe them.
      logInstallOnce("detected_standalone");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlatform("standalone");
      // item 14: re-offer alerts on this relaunch if the user has saved spots,
      // is not subscribed yet, and has not opted out or been hard-denied.
      // Otherwise the installed iOS user dead-ends: the enable step only fired
      // on a fresh save, which they already did before installing.
      try {
        const optedOut = snoozedUntil() > Date.now() || localStorage.getItem(DENIED_KEY) === "1";
        if (!optedOut && readFavoriteIds().length > 0 && !readStashedSubscription()) {
          // platform state is not readable yet (setPlatform above hasn't flushed).
          if (suppressedByEmail("standalone_relaunch", "standalone")) return;
          setTrigger("standalone_relaunch");
          setVisible(true);
        }
      } catch {
        /* private mode: skip the auto-surface */
      }
      return;
    }
    // Fires for ANY Chromium install (our button or the browser's own menu/icon).
    function handleInstalled() {
      logInstallOnce("appinstalled");
    }
    window.addEventListener("appinstalled", handleInstalled);
    if (isIOS()) {
      setPlatform("ios");
      return () => window.removeEventListener("appinstalled", handleInstalled);
    }
    // Desktop leads with email regardless of installability, so set it up front and
    // keep it even if beforeinstallprompt later fires (desktop Chrome is installable).
    if (isDesktopUA()) {
      setPlatform("desktop");
    }
    function handleBeforeInstall(e: BeforeInstallPromptEvent) {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDesktopUA()) setPlatform("android");
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  // Show after the first save, framed around alerts for that spot.
  useEffect(() => {
    function onSaved(e: WindowEventMap["ptw:spotsaved"]) {
      if (snoozedUntil() > Date.now()) return; // snoozed (was: permanent dismiss)
      if (readStashedSubscription()) return; // already subscribed
      if (suppressedByEmail("first_save", platformRef.current)) return;
      setSpotName(e.detail?.spotName || "this spot");
      setTrigger("first_save");
      setVisible(true);
    }
    window.addEventListener("ptw:spotsaved", onSaved);
    return () => window.removeEventListener("ptw:spotsaved", onSaved);
  }, []);

  // Return-session re-offer (item 16): a non-installed user who saved before but
  // never subscribed is re-offered alerts on a later visit, without needing a new
  // save, so the offer is not stuck at the first save. Standalone (installed)
  // relaunch is handled separately (item 14). Gated to engaged users (2+ saved
  // spots) and the item-15 snooze / hard-denial so it never nags.
  useEffect(() => {
    if (platform !== "ios" && platform !== "android" && platform !== "desktop") return;
    if (readStashedSubscription()) return;
    // Item 67: at most once per session, and not again until the back-off passes
    // even if the user never explicitly dismissed. Both are cheap "wouldn't show
    // anyway" checks, so they precede the suppressedByEmail guardrail without
    // affecting its accounting.
    if (returnSessionShownThisSession) return;
    try {
      if (Date.now() < returnOfferedUntil()) return;
      const optedOut = snoozedUntil() > Date.now() || localStorage.getItem(DENIED_KEY) === "1";
      if (!optedOut && readFavoriteIds().length >= 2) {
        // Item 47: gate on eligibility (opted-out / saved-spot count) BEFORE
        // suppressedByEmail, so the guardrail only fires when a prompt would
        // actually have shown here. Checking it earlier would emit a phantom
        // suppression on every pageload for a confirmed subscriber, even one
        // with < 2 saves, and defeat the guardrail's purpose.
        if (suppressedByEmail("return_session", platform)) return;
        // Item 67: mark shown (session + persistent back-off) BEFORE surfacing,
        // so a re-run or a repeat visit within the window can't re-nag.
        returnSessionShownThisSession = true;
        try {
          localStorage.setItem(RETURN_BACKOFF_KEY, String(Date.now() + RETURN_BACKOFF_MS));
        } catch {
          /* private mode: session guard still caps to once per load */
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTrigger("return_session");
        setVisible(true);
      }
    } catch {
      /* private mode */
    }
  }, [platform]);

  // Always-available entry point (item 15): the "Turn on alerts" affordance in
  // the saved-spots header dispatches this. An explicit tap bypasses the snooze
  // and the first-save gate, so a user who dismissed can still opt in later.
  useEffect(() => {
    function onEnableRequest() {
      if (readStashedSubscription()) return; // already subscribed
      // Normally unreachable: SpotList hides the "Turn on alerts" entry point
      // once alerts read as on (D18 Q2(c)). Defensive path for a stale DOM or
      // a future caller of ptw:enablealerts.
      if (suppressedByEmail("manual", platformRef.current)) {
        setYoureSet(true);
        setVisible(true);
        return;
      }
      setTrigger("manual");
      setResult(null);
      setVisible(true);
    }
    window.addEventListener("ptw:enablealerts", onEnableRequest);
    return () => window.removeEventListener("ptw:enablealerts", onEnableRequest);
  }, []);

  // Conditions-interest re-offer (item 21): a non-subscribed, non-opted-out user
  // who dwell-viewed conditions on 2+ distinct spots this session is offered
  // alerts even without a save, broadening the pool beyond savers to the core
  // paddle-decision behavior. ConditionsPanel dispatches the event once per
  // session. Respects the 14-day snooze and hard-denial like the other re-offers.
  useEffect(() => {
    function onConditionsInterest() {
      if (readStashedSubscription()) return; // already subscribed
      try {
        const optedOut = snoozedUntil() > Date.now() || localStorage.getItem(DENIED_KEY) === "1";
        if (optedOut) return;
      } catch {
        return; // private mode: skip rather than risk a bad state
      }
      // Item 47: gate on eligibility first (see return_session above) so the
      // guardrail only counts a real would-have-shown suppression.
      if (suppressedByEmail("conditions_interest", platformRef.current)) return;
      setTrigger("conditions_interest");
      setVisible(true);
    }
    window.addEventListener("ptw:conditionsinterest", onConditionsInterest);
    return () => window.removeEventListener("ptw:conditionsinterest", onConditionsInterest);
  }, []);

  const shownRef = useRef(false);

  // Item 32: the dual-CTA card renders on the three mobile surfaces
  // (standalone-not-denied, ios, android) once the card would actually show a
  // channel choice; desktop and the terminal states (granted, email pending)
  // fall through to their own single-channel copy. Shipped at 100%, so this is
  // now the default enrollment layout on mobile, not a treatment arm.
  const dualCta =
    visible &&
    !!platform &&
    platform !== "desktop" &&
    result !== "granted" &&
    emailResult !== "pending" &&
    !youreSet &&
    !(platform === "standalone" && result === "denied");

  useEffect(() => {
    // Item 47: a suppressed-then-manual "You're set." card is not a channel
    // offer, so it must never count as an enrollment impression.
    if (!visible || youreSet) { shownRef.current = false; return; }
    if (platform && !shownRef.current) {
      trackIntent("alert_optin_shown", { platform, trigger, channel: dualCta ? "both" : leadChannel(platform, result) });
      shownRef.current = true;
    }
  }, [visible, youreSet, platform, trigger, result, dualCta]);

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      /* private mode */
    }
    // Item 47: the "You're set." card never called setTrigger (it is not a
    // channel offer, see the alert_optin_shown gate above), so its dismissal
    // must not be attributed to whatever trigger value was last set, or a
    // dismiss with no matching impression lands in the funnel under a
    // fabricated trigger.
    if (platform && !youreSet) trackIntent("alert_optin_dismissed", { platform, trigger, channel: dualCta ? "both" : leadChannel(platform, result) });
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!platform) return;
    const value = email.trim();
    // Validate in JS (the form is noValidate) so we control the message instead of
    // the browser's native bubble that re-fires on every keystroke after a submit.
    if (!isValidEmail(value)) {
      setEmailError(true);
      return;
    }
    setEmailSubmitting(true);
    const watched = readFavoriteIds();
    // A push-denied installed user reaching the email rescue is a distinct context.
    const submitTrigger = platform === "standalone" ? "push_denied" : trigger;
    trackIntent("email_capture_submitted", { platform, trigger: submitTrigger, watched_count: watched.length });
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, watchedSpotIds: watched, anonId: getAnonId() }),
      });
      if (!res.ok) {
        trackSystem("email_capture_failed", { status: res.status, source: "submit" });
        setEmailResult("failed");
      } else {
        // Show "check your inbox" and leave it up: the user dismisses with the X.
        // (It used to auto-hide after 4.5s, which closed before people could read it.)
        setEmailResult("pending");
        setPersona({ email_captured: true });
        setPersona({ email_submit_platform: platform, email_submit_trigger: submitTrigger });
      }
    } catch {
      trackSystem("email_capture_failed", { status: null, source: "submit" });
      setEmailResult("failed");
    }
    setEmailSubmitting(false);
  }

  async function handleResend() {
    if (!platform || resendCooling) return;
    const submitTrigger = platform === "standalone" ? "push_denied" : trigger;
    trackIntent("email_confirm_resend_clicked", { platform, trigger: submitTrigger, watched_count: readFavoriteIds().length });
    setResendState("sending");
    const r = await submitEmailCapture(email.trim(), readFavoriteIds(), getAnonId());
    if (r.outcome === "pending") {
      setResendState("sent");
      setResendCooling(true);
      setTimeout(() => setResendCooling(false), RESEND_COOLDOWN_MS);
    } else if (r.outcome === "already_confirmed") {
      setResendState("confirmed");
    } else {
      trackSystem("email_capture_failed", { status: r.httpStatus, source: "resend" });
      setResendState("failed");
      setResendCooling(true);
      setTimeout(() => setResendCooling(false), RESEND_COOLDOWN_MS);
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // Accepted installs are logged by the appinstalled listener; only the
    // declined native dialog is worth an event of its own here.
    if (outcome === "dismissed") {
      trackIntent("pwa_installed", { platform, outcome });
    }
    if (outcome === "accepted") {
      setPersona({ installed_pwa: true });
      setPlatform("standalone"); // now show the enable-alerts step
    }
    setDeferredPrompt(null);
  }

  async function handleEnable() {
    if (!platform) return; // unreachable: the Enable button only renders with a platform
    setEnabling(true);
    const r = await enablePushAlerts(readFavoriteIds());
    setEnabling(false);
    setResult(r);
    trackIntent("alert_optin_result", { platform, result: r });
    if (r === "granted") {
      setPersona({ alerts_enabled: true });
      window.dispatchEvent(new Event("ptw:alertsenabled")); // let the saved-spots entry point hide
      setTimeout(() => setVisible(false), 1600);
    } else if (r === "denied") {
      // Persist the hard denial so a standalone relaunch does not re-offer.
      try { localStorage.setItem(DENIED_KEY, "1"); } catch { /* private mode */ }
    }
  }

  if (!visible || !platform) return null;

  // When a drawer is open, anchor to the top so the banner is visible at save
  // time without covering the drawer's bottom Save/Share actions.
  const anchorTop = drawerOpen;

  // Item 66: light Meltwater card (was a dark navy chat bubble), converging on
  // the rest of the app. Block layout, relative so the × can sit in the corner
  // and the content uses the full width (the old flex row shared width with the
  // emoji + ×, forcing text to wrap). ALL logic/handlers/effects unchanged.
  const card: React.CSSProperties = {
    position: "relative",
    background: "#FFFFFF",
    color: "var(--dark)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "16px",
    maxWidth: 420,
    width: "calc(100% - 32px)",
    boxShadow: "0 8px 30px rgba(11,42,71,0.14)",
    pointerEvents: "auto",
  };
  const subStyle: React.CSSProperties = { margin: "4px 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.4 };
  const footnote: React.CSSProperties = { margin: "6px 0 0", fontSize: 11, color: "var(--muted)", lineHeight: 1.45 };
  const errorText: React.CSSProperties = { margin: "6px 0 0", fontSize: 12, color: "var(--wind-alert)", lineHeight: 1.4 };
  // Full-width primary push button (item 32), matching SpotDrawer's primary CTA.
  const pushBtn: React.CSSProperties = {
    background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12,
    padding: "12px 16px", fontSize: 14, fontWeight: 600, width: "100%", cursor: "pointer",
  };
  // Email submit button (inline next to the input); min-width so it never
  // squeezes the input, short label ("Email me").
  const submitBtn: React.CSSProperties = {
    background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10,
    padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", minWidth: 88,
  };
  // Outline secondary (resend), matching SpotDrawer's Share button.
  const outlineBtn: React.CSSProperties = {
    background: "transparent", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 12,
    padding: "10px 16px", fontSize: 14, fontWeight: 600, width: "100%", cursor: "pointer",
  };
  // Tertiary underline link (iOS channel toggle). py padding => ~44px tap target.
  const linkBtn: React.CSSProperties = {
    background: "transparent", border: "none", color: "var(--accent)",
    textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer", fontSize: 14, padding: "8px 0",
  };
  const divider = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      <span style={{ fontSize: 12, color: "var(--muted)" }}>or</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );

  // Item 66: state-driven icon badge replacing the 🚣 emoji (the app's only
  // emoji; everything else is a stroked SVG). Bell = an offer, envelope =
  // pending confirm, check = done. Decorative (aria-hidden); the headline
  // carries the meaning.
  const iconKind: "offer" | "pending" | "done" =
    youreSet || result === "granted" ? "done" : emailResult === "pending" ? "pending" : "offer";
  const badge = (() => {
    const wrap = (bg: string, fg: string, path: React.ReactNode) => (
      <span aria-hidden className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: bg, color: fg }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
      </span>
    );
    if (iconKind === "done") return wrap("var(--free-fill)", "var(--free)", <path d="M20 6 9 17l-5-5" />);
    if (iconKind === "pending") return wrap("var(--accent-light)", "var(--accent)", <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>);
    return wrap("var(--accent-light)", "var(--accent)", <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>);
  })();

  // Header: icon badge + headline on one row, sub full-width below. A plain
  // render helper (lowercase, called as a function), NOT a component defined in
  // render, so React doesn't remount the subtree each render.
  const header = (title: React.ReactNode, sub?: React.ReactNode) => (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {badge}
        {/* paddingRight clears the corner × so a long headline wraps before it. */}
        <p className="font-['Newsreader']" style={{ margin: 0, flex: 1, minWidth: 0, paddingRight: 28, fontWeight: 600, fontSize: 16, lineHeight: 1.25, color: "var(--dark)" }}>{title}</p>
      </div>
      {sub && <p style={subStyle}>{sub}</p>}
    </>
  );

  // Email capture block (item 23). The bare form + inline errors + disclaimer,
  // no headline/sub: emailForm() wraps this with a headline for the control
  // cards, and the item-32 treatment branch calls it directly so it doesn't
  // duplicate the shared headline/subhead rendered above the push button.
  function emailRow() {
    return (
      <>
        <form onSubmit={handleEmailSubmit} noValidate style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => { setEmail(ev.target.value); if (emailError) setEmailError(false); }}
            placeholder="you@email.com"
            aria-label="Email address"
            style={{
              flex: 1, minWidth: 0, borderRadius: 10, border: "1px solid var(--border)",
              padding: "10px 12px", fontSize: 14, background: "var(--fill)", color: "var(--dark)",
              colorScheme: "light",
            }}
          />
          <button type="submit" disabled={emailSubmitting} style={submitBtn}>
            {emailSubmitting ? "..." : "Email me"}
          </button>
        </form>
        {emailError && <p style={errorText}>Enter a valid email address.</p>}
        {emailResult === "failed" && <p style={errorText}>Something went wrong. Try again.</p>}
        {/* Item 66: the "one email a day, max / unsubscribe anytime" reassurance
            line was cut (owner, 2026-07-18): filler that added no info the reader
            needs at this moment and wrapped ugly on mobile. The CAN-SPAM
            unsubscribe path lives in the emails, not here. */}
        {/* Item 34: the canonical safety line at the consent moment, so enrolling
            is informed. In the slot that already holds the standing terms, NOT
            between the headline and the button (a caveat above the CTA reads as a
            warning about the CTA on the retention loop's conversion path). Kept
            BYTE-FOR-BYTE identical to ConditionsPanel (item 66 constraint). */}
        <p style={footnote}>Guidance only, not a safety guarantee. Conditions shift fast on the water.</p>
      </>
    );
  }

  // Email capture block (item 23). `secondary` is an optional channel toggle
  // rendered below (iOS: reveal install steps; Android: swap back to install).
  function emailForm(headline: string, sub: string, secondary?: React.ReactNode) {
    return (
      <div style={{ minWidth: 0 }}>
        {header(headline, sub)}
        {emailRow()}
        {secondary && <div style={{ marginTop: 12 }}>{secondary}</div>}
      </div>
    );
  }

  const iosSteps = (
    <div style={{ minWidth: 0 }}>
      {header("Add to your home screen")}
      <ol style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
        <li>
          Tap the Share icon{" "}
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle" }}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </li>
        <li>Pick &ldquo;Add to Home Screen&rdquo;</li>
        <li>Open it to turn on alerts</li>
      </ol>
      <button onClick={() => setAltChannel(false)} style={{ ...linkBtn, marginTop: 4 }}>Use email instead</button>
    </div>
  );

  let body: React.ReactNode;
  if (youreSet) {
    // Item 47: confirmed email subscriber hit the manual entry point. Static
    // card, no push offer (D18 Q2(c) preserves the desktop-never-offers-push
    // invariant); reuses the granted-push copy pattern with the email verb.
    body = (
      <div style={{ minWidth: 0 }}>
        {header("You're set.", "We'll email you when your spots are good to paddle.")}
      </div>
    );
  } else if (result === "granted") {
    body = (
      <div style={{ minWidth: 0 }}>
        {header("You're set.", "We'll ping you when your spots are good to paddle.")}
      </div>
    );
  } else if (emailResult === "pending") {
    // Double opt-in sent: nothing to do until they click the confirm link.
    // Item 24: a resend control rescues the user if the mail lands in spam or
    // never arrives, instead of leaving them stuck with only "check your inbox".
    body = (
      <div style={{ minWidth: 0 }}>
        {header("Check your inbox.", "Tap the link in that email to finish setting up alerts.")}
        <p style={footnote}>{RESEND_SPAM_LINE}</p>
        {(() => {
          const resendDisabled =
            resendState === "sending" || resendState === "confirmed" || resendCooling;
          return (
            <button
              onClick={handleResend}
              disabled={resendDisabled}
              style={{
                ...outlineBtn,
                marginTop: 10,
                opacity: resendDisabled ? 0.55 : 1,
                cursor: resendDisabled ? "default" : "pointer",
              }}
            >
              {resendState === "sending" ? RESEND_SENDING_LABEL : RESEND_LABEL}
            </button>
          );
        })()}
        {resendState === "sent" && <p style={footnote}>{RESEND_SENT_NOTE}</p>}
        {resendState === "confirmed" && <p style={footnote}>{RESEND_CONFIRMED_NOTE}</p>}
        {resendState === "failed" && <p style={errorText}>{RESEND_FAILED_NOTE}</p>}
      </div>
    );
  } else if (dualCta) {
    // Item 32: dual-CTA card. Equal-weight push button, "or" divider,
    // then the inline email row, in that literal DOM order (tab order =
    // reading order). Desktop never reaches here (excluded by dualCta).
    if (platform === "ios") {
      body = altChannel
        ? iosSteps
        : (
          <div style={{ minWidth: 0 }}>
            {header("Get alerts when your spots are good to paddle", "Push or email, your call.")}
            <button onClick={() => setAltChannel(true)} style={{ ...pushBtn, marginTop: 12 }}>Add to Home Screen</button>
            {divider}
            {emailRow()}
          </div>
        );
    } else if (platform === "android") {
      body = (
        <div style={{ minWidth: 0 }}>
          {header(trigger === "first_save" ? `Get alerts when ${spotName} is good to paddle` : "Get alerts when your spots are good to paddle", "Push or email, your call.")}
          <button onClick={handleInstall} style={{ ...pushBtn, marginTop: 12 }}>Install app</button>
          {divider}
          {emailRow()}
        </div>
      );
    } else {
      // standalone, not push-denied (dualCta already excludes denied).
      body = (
        <div style={{ minWidth: 0 }}>
          {header(trigger === "first_save" ? `Get alerts when ${spotName} is good to paddle` : "Get alerts when your spots are good to paddle", "Push or email, your call.")}
          <button onClick={handleEnable} disabled={enabling} style={{ ...pushBtn, marginTop: 12 }}>
            {enabling ? "Turning on..." : "Turn on push"}
          </button>
          {divider}
          {emailRow()}
        </div>
      );
    }
  } else if (platform === "desktop") {
    // Desktop leads with email: install is near-useless, desktop push rarely seen.
    // Desktop is the one surface excluded from the dual-CTA card (E5: desktop
    // never offers push).
    body = emailForm("Get alerts by email", "We'll email you when a spot you watch is good to paddle.");
  } else {
    // Installed (standalone) with push hard-denied: the only mobile surface the
    // dual-CTA card excludes. Rescue with email instead of the old
    // browser-settings dead end.
    body = emailForm("Get alerts by email instead", "We'll email you when your spots are good to paddle.");
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 0, right: 0, zIndex: 1500,
        display: "flex", justifyContent: "center",
        pointerEvents: "none",
        ...(anchorTop
          ? { top: "env(safe-area-inset-top, 0px)", padding: "12px 0 0 0" }
          : { bottom: "env(safe-area-inset-bottom, 0px)", padding: "0 0 12px 0" }),
      }}
    >
      <div style={card}>
        {body}
        {/* Item 66: dismiss moves to its own top-right corner slot (SVG, not a
            glyph) so it never shares a row with, or crowds, the content. */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="hover:bg-(--fill) motion-safe:transition-colors"
          style={{
            position: "absolute", top: 8, right: 8, width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", borderRadius: 9999,
            color: "var(--muted)", cursor: "pointer",
          }}
        >
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
