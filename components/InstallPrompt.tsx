"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const STORAGE_KEY = "ptw-install-dismissed";

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

type Platform = "ios" | "android" | null;

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return;

    if (isIOS()) {
      setPlatform("ios");
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    let timer: ReturnType<typeof setTimeout>;

    function handleBeforeInstall(e: BeforeInstallPromptEvent) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      timer = setTimeout(() => setVisible(true), 3000);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  function handleDismiss() {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, "1");
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible || !platform) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "env(safe-area-inset-bottom, 0px)",
        left: 0,
        right: 0,
        zIndex: 1500,
        display: "flex",
        justifyContent: "center",
        padding: "0 0 12px 0",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
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
        }}
      >
        <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>🚣</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
            Add to Home Screen
          </p>
          {platform === "ios" ? (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.4 }}>
              Tap{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "inline", verticalAlign: "middle" }}
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>{" "}
              <strong>Share</strong> then &ldquo;Add to Home Screen&rdquo;
            </p>
          ) : (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.72)" }}>
              Install for quick access
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {platform === "android" && (
            <button
              onClick={handleInstall}
              style={{
                background: "#2D6A8F",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.55)",
              cursor: "pointer",
              fontSize: 22,
              lineHeight: 1,
              padding: "0 2px",
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
