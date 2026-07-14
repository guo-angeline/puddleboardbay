// Pure email composition for the alert channel. No I/O, unit-tested. House copy
// rules: no em dashes, one fact per line. The Resend wrapper adds the transport
// headers (List-Unsubscribe); these functions own subject + html + text + the
// URLs that carry the return token.

import { SITE_URL } from "@/lib/structured-data";

// Verified sending domain (DECISIONS D5 / DNS verified 2026-07-10). The alias is
// a subdomain so alert-sender reputation is isolated from the root domain.
export const FROM = "Paddle to Water <conditions@alerts.paddletowater.com>";

// CAN-SPAM requires a physical postal address in every email (DECISIONS D5).
export const POSTAL_ADDRESS = "500 Folsom St, San Francisco, CA 94105";

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

export function confirmUrl(confirmToken: string): string {
  return `${SITE_URL}/api/email/confirm?t=${encodeURIComponent(confirmToken)}`;
}

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/email/unsubscribe?t=${encodeURIComponent(token)}`;
}

// Deep link the app opens from an alert email. `from=email` distinguishes it from
// push (`from=alert`) so the push interstitial does not show; `t` is the durable
// subscription token that rides the link so the open-ping works after ITP wipes
// client storage (mirrors the push token flow). `v` is the copy-variant index so
// email_alert_opened can segment clicks by wording.
export function emailOpenUrl(spotId: number, token: string, variant?: number): string {
  const v = variant === undefined ? "" : `&v=${variant}`;
  return `${SITE_URL}/?spot=${spotId}&from=email&t=${encodeURIComponent(token)}${v}`;
}

function shell(bodyHtml: string, unsubUrl: string, preheader: string): string {
  return `<!doctype html><html><body style="margin:0;background:#EEF5FB;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0B2A47">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">${preheader}</div>
  <div style="max-width:480px;margin:0 auto;padding:24px">
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #DCE7F0;margin:24px 0 12px">
    <p style="font-size:12px;color:#6E8598;line-height:1.5;margin:0">
      You're getting this because you signed up for paddle alerts at paddletowater.com.<br>
      <a href="${unsubUrl}" style="color:#6E8598">Unsubscribe</a> &middot; Paddle to Water, ${POSTAL_ADDRESS}
    </p>
  </div></body></html>`;
}

export function composeConfirmEmail(confirmToken: string, token: string): EmailMessage {
  const url = confirmUrl(confirmToken);
  const subject = "Confirm your Paddle to Water alerts";
  const html = shell(
    `<p style="font-size:16px;font-weight:600;margin:0 0 8px">Confirm your alerts</p>
     <p style="font-size:14px;line-height:1.5;margin:0 0 12px">You asked us to keep an eye on your paddling spots. Confirm and we'll email you when one is good to paddle.</p>
     <a href="${url}" style="display:inline-block;background:#0E6FD1;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">Confirm alerts</a>
     <p style="font-size:13px;color:#6E8598;line-height:1.5;margin:16px 0 0">One email a day at most, only when a spot's good to paddle. Unsubscribe any time in one tap.</p>
     <p style="font-size:13px;color:#6E8598;line-height:1.5;margin:8px 0 0">Didn't sign up? Ignore this email and nothing happens.</p>`,
    unsubscribeUrl(token),
    "Confirm to start getting paddle alerts for your spots."
  );
  const text = `Confirm your Paddle to Water alerts.\n\nYou asked us to keep an eye on your paddling spots. Confirm and we'll email you when one is good to paddle:\n${url}\n\nOne email a day at most, only when a spot's good to paddle. Unsubscribe any time in one tap.\n\nDidn't sign up? Ignore this email and nothing happens.`;
  return { subject, html, text };
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Weekday name for a spot-local YYYY-MM-DD window key (e.g. "Saturday"). */
export function weekdayFromKey(windowKey: string): string {
  return WEEKDAYS[new Date(`${windowKey}T00:00:00Z`).getUTCDay()];
}

/** A single spot-local hour, e.g. 7 -> "7am", 13 -> "1pm", 12 -> "12pm". */
export function formatHour(h: number): string {
  const ap = h % 24 < 12 ? "am" : "pm";
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n}${ap}`;
}

/** A calm-window hour range, e.g. (7,10) -> "7 to 10am", (10,13) -> "10am to 1pm". */
export function formatHourRange(startHour: number, endHour: number): string {
  const sameHalf = startHour % 24 < 12 === endHour % 24 < 12;
  const startText = sameHalf ? String(startHour % 12 === 0 ? 12 : startHour % 12) : formatHour(startHour);
  return `${startText} to ${formatHour(endHour)}`;
}

export interface AlertExtra {
  name: string;
  windowKey: string;
  startHour: number;
  endHour: number;
}

export interface AlertEmailInput {
  spotName: string;
  spotId: number;
  windowKey: string; // YYYY-MM-DD spot-local, to name the weekday
  startHour: number;
  endHour: number;
  maxWindMph?: number; // peak wind across the window; omitted/0 -> wind line dropped
  notes?: string; // put-in details from the spot
  extras: AlertExtra[]; // additional good spots beyond the first, already selected
  token: string;
  variant?: number; // 0-6 copy rotation index (alertVariantForDay); defaults to 0, the original wording
}

// ── Copy rotation (owner request 2026-07-13: same paragraph every day is boring) ──
// Seven wording sets, same facts, rotated by UTC day so consecutive daily emails
// never repeat. Variant 0 is the original copy. Editor-written 2026-07-13.
// Placeholders: {spot} {weekday} {hours} {lengthHours} {wind} {count}.

interface AlertVariant {
  name: string;
  subjectSingle: string;
  subjectMultiSameDay: string;
  subjectMultiSoon: string;
  headline: string;
  bodyNoWind: string;
  bodyWithWind: string;
  cta: string;
  preheaderNoWind: string;
  preheaderWithWind: string;
}

export const ALERT_VARIANTS: readonly AlertVariant[] = [
  {
    name: "baseline",
    subjectSingle: "{spot} is good to paddle {weekday}",
    subjectMultiSameDay: "{count} spots good to paddle {weekday}",
    subjectMultiSoon: "{count} spots good to paddle soon",
    headline: "{spot} is good to paddle {weekday}, {hours}.",
    bodyNoWind: "That's about a {lengthHours}-hour window.",
    bodyWithWind: "That's about a {lengthHours}-hour window, with wind topping out at {wind} mph.",
    cta: "See the forecast",
    preheaderNoWind: "{hours}, about a {lengthHours}-hour window.",
    preheaderWithWind: "{hours}, about a {lengthHours}-hour window, with wind topping out at {wind} mph.",
  },
  {
    name: "plain-report",
    subjectSingle: "Calm window: {spot}, {weekday}",
    subjectMultiSameDay: "Calm windows {weekday} at {count} spots",
    subjectMultiSoon: "Calm windows ahead at {count} spots",
    headline: "{spot}: calm {weekday}, {hours}.",
    bodyNoWind: "About {lengthHours} hours of calm.",
    bodyWithWind: "About {lengthHours} hours of calm; wind peaks at {wind} mph.",
    cta: "Check conditions",
    preheaderNoWind: "Calm {weekday} {hours}, about {lengthHours} hours.",
    preheaderWithWind: "Calm {weekday} {hours}, about {lengthHours} hours; wind peaks at {wind} mph.",
  },
  {
    name: "friendly-local",
    subjectSingle: "{weekday} looks good at {spot}",
    subjectMultiSameDay: "{weekday} looks good at {count} of your spots",
    subjectMultiSoon: "{count} of your spots look good soon",
    headline: "Good news: {spot} looks calm {weekday}, {hours}.",
    bodyNoWind: "You've got a {lengthHours}-hour stretch of calm water.",
    bodyWithWind: "You've got a {lengthHours}-hour stretch of calm water, with wind no higher than {wind} mph.",
    cta: "Plan your paddle",
    preheaderNoWind: "Calm water {hours}, a {lengthHours}-hour stretch.",
    preheaderWithWind: "Calm water {hours}, a {lengthHours}-hour stretch, wind no higher than {wind} mph.",
  },
  {
    name: "water-first",
    subjectSingle: "Calm water at {spot} {weekday} 🌊",
    subjectMultiSameDay: "Calm water {weekday} at {count} spots",
    subjectMultiSoon: "Calm water coming at {count} spots",
    headline: "Calm water at {spot} {weekday}, {hours}.",
    bodyNoWind: "Roughly {lengthHours} hours of it.",
    bodyWithWind: "Roughly {lengthHours} hours of it, and wind stays at or below {wind} mph.",
    cta: "See the window",
    preheaderNoWind: "{weekday} {hours}: roughly {lengthHours} hours of calm water.",
    preheaderWithWind: "{weekday} {hours}: roughly {lengthHours} hours of calm water, wind at or below {wind} mph.",
  },
  {
    name: "window-scarcity",
    subjectSingle: "{spot} has a window {weekday}",
    subjectMultiSameDay: "{count} spots have windows {weekday}",
    subjectMultiSoon: "{count} spots have windows coming up",
    headline: "Your window at {spot}: {weekday}, {hours}.",
    bodyNoWind: "You get about {lengthHours} hours before it closes.",
    bodyWithWind: "You get about {lengthHours} hours before it closes, wind up to {wind} mph.",
    cta: "See when to go",
    preheaderNoWind: "Your window: {weekday} {hours}, about {lengthHours} hours.",
    preheaderWithWind: "Your window: {weekday} {hours}, about {lengthHours} hours, wind up to {wind} mph.",
  },
  {
    name: "weather-nerd",
    subjectSingle: "Forecast: calm at {spot} {weekday}",
    subjectMultiSameDay: "Forecast: {count} spots calm {weekday}",
    subjectMultiSoon: "Forecast: calm at {count} spots soon",
    headline: "Forecast says {spot} is calm {weekday}, {hours}.",
    bodyNoWind: "A {lengthHours}-hour calm stretch.",
    bodyWithWind: "A {lengthHours}-hour calm stretch, peak wind {wind} mph.",
    cta: "See the numbers",
    preheaderNoWind: "{weekday} {hours}, a {lengthHours}-hour calm stretch.",
    preheaderWithWind: "{weekday} {hours}, a {lengthHours}-hour calm stretch, peak wind {wind} mph.",
  },
  {
    name: "pencil-it-in",
    subjectSingle: "Pencil in {spot} for {weekday}",
    subjectMultiSameDay: "Pencil in {weekday}: {count} spots look calm",
    subjectMultiSoon: "{count} spots worth penciling in",
    headline: "Pencil it in: {spot}, {weekday}, {hours}.",
    bodyNoWind: "That's a {lengthHours}-hour window to work with.",
    bodyWithWind: "That's a {lengthHours}-hour window to work with, with wind maxing out at {wind} mph.",
    cta: "See spot details",
    preheaderNoWind: "{weekday} {hours} is yours: a {lengthHours}-hour window.",
    preheaderWithWind: "{weekday} {hours} is yours: a {lengthHours}-hour window, wind maxing out at {wind} mph.",
  },
];

export const ALERT_VARIANT_COUNT = ALERT_VARIANTS.length;

/**
 * Deterministic day-over-day rotation. Not a plain day mod 7: with exactly 7
 * variants that would pin each weekday to one wording forever (every Saturday
 * email identical, and weekday perfectly confounded with variant in analytics).
 * Adding the week number shifts the weekday->variant mapping by one each week;
 * consecutive days still always differ (delta is 1, or 2 at a week boundary).
 */
export function alertVariantForDay(nowMs: number): number {
  const day = Math.floor(nowMs / 86_400_000);
  return (day + Math.floor(day / 7)) % ALERT_VARIANT_COUNT;
}

function fill(template: string, vals: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vals[k] ?? ""));
}

// Name up to this many extra spots before collapsing the rest into "and N more".
const MAX_NAMED_EXTRAS = 3;

function extrasLine(extras: AlertEmailInput["extras"]): string {
  if (extras.length === 0) return "";
  const named = extras
    .slice(0, MAX_NAMED_EXTRAS)
    .map((e) => `${e.name}, ${weekdayFromKey(e.windowKey)} ${formatHourRange(e.startHour, e.endHour)}`);
  const more = extras.length - named.length;
  return `Also good: ${named.join("; ")}${more > 0 ? `, and ${more} more` : ""}.`;
}

export function composeAlertEmail(input: AlertEmailInput): EmailMessage {
  const { spotName, spotId, windowKey, startHour, endHour, maxWindMph, notes, extras, token, variant } = input;
  const v = ALERT_VARIANTS[((variant ?? 0) % ALERT_VARIANT_COUNT + ALERT_VARIANT_COUNT) % ALERT_VARIANT_COUNT];
  const openUrl = emailOpenUrl(spotId, token, variant);
  const weekday = weekdayFromKey(windowKey);
  const hours = formatHourRange(startHour, endHour);
  const lengthHours = endHour - startHour;
  const count = extras.length + 1;
  const vals = { spot: spotName, weekday, hours, lengthHours, wind: maxWindMph ?? 0, count };

  // Only claim a shared weekday in the multi-spot subject when every spot really
  // is good that same day; extras can fall on different days in the 3-day horizon.
  const allSameDay = extras.every((e) => e.windowKey === windowKey);
  const subject = fill(
    count > 1 ? (allSameDay ? v.subjectMultiSameDay : v.subjectMultiSoon) : v.subjectSingle,
    vals
  );

  const headline = fill(v.headline, vals);
  const lengthLine = fill(maxWindMph ? v.bodyWithWind : v.bodyNoWind, vals);
  const preheader = fill(maxWindMph ? v.preheaderWithWind : v.preheaderNoWind, vals);

  const extrasHtml = extras.length
    ? `<p style="font-size:14px;line-height:1.5;margin:0 0 12px">${escapeHtml(extrasLine(extras))}</p>`
    : "";
  const notesHtml = notes
    ? `<p style="font-size:13px;color:#6E8598;line-height:1.5;margin:0 0 16px">${escapeHtml(notes)}</p>`
    : "";

  const html = shell(
    `<p style="font-size:16px;font-weight:600;margin:0 0 8px">${escapeHtml(headline)}</p>
     <p style="font-size:14px;line-height:1.5;margin:0 0 12px">${escapeHtml(lengthLine)}</p>
     ${extrasHtml}
     ${notesHtml}
     <a href="${openUrl}" style="display:inline-block;background:#0E6FD1;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">${escapeHtml(v.cta)}</a>`,
    unsubscribeUrl(token),
    preheader
  );

  const text = `${headline}\n\n${lengthLine}\n${extras.length ? `\n${extrasLine(extras)}\n` : ""}${notes ? `\n${notes}\n` : ""}\n${v.cta}: ${openUrl}`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
