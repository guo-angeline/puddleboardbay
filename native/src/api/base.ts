import { configureConditionsFetch } from "@/lib/conditions";

/**
 * Production origin of the web app. The native app rides its API surface:
 * /api/tides (NOAA proxy with caching + retry), /api/alerts/*, /api/email/*.
 */
export const API_BASE = "https://paddletowater.com";

/**
 * Point the shared conditions module at the production tides proxy and give
 * api.weather.gov an explicit User-Agent (NWS rate-limits the default
 * CFNetwork agent; browsers can't set this header, native can). Call once at
 * app startup, before any conditions fetch.
 */
export function configureApi(): void {
  configureConditionsFetch({
    apiBase: API_BASE,
    headers: { "User-Agent": "paddle-to-water-ios (hello@paddletowater.com)" },
  });
}
