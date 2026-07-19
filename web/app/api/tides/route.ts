import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Same-origin proxy for NOAA CO-OPS tide predictions.
 *
 * The client used to hit `api.tidesandcurrents.noaa.gov` directly, but NOAA
 * sends `access-control-allow-origin: *` only intermittently (measured 2 of 4
 * back-to-back calls on 2026-07-17). When the header is absent the browser
 * blocks the response and the tide half of the conditions panel silently drops.
 * Fetching server-side removes CORS from the path entirely; NOAA's occasional
 * 504s are absorbed with a short timeout and one retry, and identical
 * station+day requests are served from a small in-memory cache (predictions for
 * a station and date are stable, so this also keeps us from hammering NOAA).
 *
 * Wind stays a direct browser fetch to weather.gov, which sends the CORS header
 * reliably. The alert crons fetch NOAA server-side already and do not use this
 * route. (ROADMAP item 52.)
 */

const NOAA_BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
// Per-attempt timeout. Healthy NOAA answers well under 1s; keep this tight so a
// flaky upstream can't run the timeout + one retry into a long wait (item 53,
// owner note). The client (fetchTides) also caps its own patience at 4s, so the
// user never waits on the full server budget; this mainly bounds the wasted work
// and lets a cache-warming retry still fit inside a reasonable window.
const FETCH_TIMEOUT_MS = 2500;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min: a day's hi/lo predictions are stable.

interface CacheEntry {
  body: unknown;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

async function fetchNoaaOnce(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** One retry absorbs NOAA's intermittent 504s and transient network aborts. */
async function fetchNoaaWithRetry(url: string): Promise<Response> {
  try {
    const res = await fetchNoaaOnce(url);
    if (res.status >= 500) return await fetchNoaaOnce(url);
    return res;
  } catch {
    return await fetchNoaaOnce(url);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const station = searchParams.get("station") ?? "";
  const begin = searchParams.get("begin_date") ?? "";
  const end = searchParams.get("end_date") ?? "";

  // Validate the caller-supplied values before forwarding: station ids are 6-8
  // digits, dates are YYYYMMDD. Everything else about the NOAA request is fixed
  // here, so the client cannot steer this into an arbitrary upstream call.
  if (!/^\d{6,8}$/.test(station) || !/^\d{8}$/.test(begin) || !/^\d{8}$/.test(end)) {
    return NextResponse.json({ error: { message: "invalid station or date" } }, { status: 400 });
  }

  const key = `${station}:${begin}:${end}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return NextResponse.json(hit.body);
  }

  const params = new URLSearchParams({
    product: "predictions",
    application: "paddle-to-water",
    begin_date: begin,
    end_date: end,
    datum: "MLLW",
    station,
    time_zone: "lst_ldt",
    interval: "hilo",
    units: "english",
    format: "json",
  });

  let res: Response;
  try {
    res = await fetchNoaaWithRetry(`${NOAA_BASE}?${params.toString()}`);
  } catch {
    return NextResponse.json({ error: { message: "tides upstream unreachable" } }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: { message: `tides upstream ${res.status}` } }, { status: 502 });
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return NextResponse.json({ error: { message: "tides upstream bad json" } }, { status: 502 });
  }

  // NOAA returns 200 with an `{ error }` body for a bad station/date. Pass it
  // through as a 502 (don't cache) so the client treats it as a tide failure.
  if (body && typeof body === "object" && "error" in body) {
    return NextResponse.json(body, { status: 502 });
  }

  cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
  return NextResponse.json(body);
}
