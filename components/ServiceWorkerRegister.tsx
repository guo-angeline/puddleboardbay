"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push";

/**
 * Registers the push service worker once on load for every visit, so an
 * already-subscribed device can receive pushes without opening the prompt.
 * Renders nothing.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
