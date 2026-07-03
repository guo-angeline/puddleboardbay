"use client";

import { useEffect, useRef, useState } from "react";
import { track, setPersona } from "@/lib/analytics";
import { enablePushAlerts, readStashedSubscription, type OptInResult } from "@/lib/push";

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

const STORAGE_KEY = "ptw-install-dismissed";
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
  track("pwa_installed", { platform: isIOS() ? "ios" : "android", outcome });
  setPersona({ installed_pwa: true });
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
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

// standalone = installed (can enable push now); ios/android = needs install first.
type Platform = "standalone" | "ios" | "android" | null;

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [spotName, setSpotName] = useState("this spot");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [result, setResult] = useState<OptInResult | null>(null);

  // Hide while a spot drawer is open (banner sits above the drawer's Get Directions).
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
    function handleBeforeInstall(e: BeforeInstallPromptEvent) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
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
      if (localStorage.getItem(STORAGE_KEY) === "1") return; // user dismissed before
      if (readStashedSubscription()) return; // already subscribed
      setSpotName(e.detail?.spotName || "this spot");
      setVisible(true);
    }
    window.addEventListener("ptw:spotsaved", onSaved);
    return () => window.removeEventListener("ptw:spotsaved", onSaved);
  }, []);

  const shownRef = useRef(false);
  useEffect(() => {
    if (!visible) { shownRef.current = false; return; }
    if (platform && !shownRef.current) {
      track("alert_optin_shown", { platform });
      shownRef.current = true;
    }
  }, [visible, platform]);

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // Accepted installs are logged by the appinstalled listener; only the
    // declined native dialog is worth an event of its own here.
    if (outcome === "dismissed") {
      track("pwa_installed", { platform, outcome });
    }
    if (outcome === "accepted") {
      setPersona({ installed_pwa: true });
      setPlatform("standalone"); // now show the enable-alerts step
    }
    setDeferredPrompt(null);
  }

  async function handleEnable() {
    setEnabling(true);
    const r = await enablePushAlerts(readFavoriteIds());
    setEnabling(false);
    setResult(r);
    track("alert_optin_result", { platform, result: r });
    if (r === "granted") {
      setPersona({ alerts_enabled: true });
      setTimeout(() => setVisible(false), 1600);
    }
  }

  if (!visible || !platform || drawerOpen) return null;

  const card: React.CSSProperties = {
    background: "#1A2C36",
    color: "#FFFFFF",
    borderRadius: 14,
    padding: "12px 16px",
    maxWidth: 420,
    width: "calc(100% - 32px)",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
    pointerEvents: "auto",
  };
  const muted = { margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.4 } as const;
  const primaryBtn: React.CSSProperties = {
    background: "#2D6A8F", color: "#fff", border: "none", borderRadius: 8,
    padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  };

  let body: React.ReactNode;
  if (result === "granted") {
    body = (
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>You are set.</p>
        <p style={muted}>We will ping you when your spots look good to paddle.</p>
      </div>
    );
  } else if (platform === "standalone") {
    body = (
      <>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
            Get a heads-up when {spotName} is good to paddle
          </p>
          <p style={muted}>
            {result === "denied"
              ? "Notifications are blocked. Enable them for this site in your browser settings."
              : "Turn on alerts and we will notify you when conditions look good."}
          </p>
        </div>
        {result !== "denied" && (
          <button onClick={handleEnable} disabled={enabling} style={primaryBtn}>
            {enabling ? "Enabling..." : "Enable alerts"}
          </button>
        )}
      </>
    );
  } else if (platform === "ios") {
    body = (
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
          Get alerts when {spotName} is good to paddle
        </p>
        <p style={muted}>
          <span>Add this app to your home screen first: tap the Share icon</span>{" "}
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle" }}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>, then pick &ldquo;Add to Home Screen.&rdquo; Open it from there to turn on alerts.</span>
        </p>
      </div>
    );
  } else {
    // android (beforeinstallprompt available) or unknown: offer install
    body = (
      <>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
            Get alerts when {spotName} is good to paddle
          </p>
          <p style={muted}>Install the app, then turn on alerts for your saved spots.</p>
        </div>
        {platform === "android" && (
          <button onClick={handleInstall} style={primaryBtn}>Install</button>
        )}
      </>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "env(safe-area-inset-bottom, 0px)",
        left: 0, right: 0, zIndex: 1500,
        display: "flex", justifyContent: "center",
        padding: "0 0 12px 0", pointerEvents: "none",
      }}
    >
      <div style={card}>
        <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>🚣</div>
        {body}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent", border: "none", color: "rgba(255,255,255,0.55)",
            cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 2px", flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
