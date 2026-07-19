// Pure email composition for the alert channel. No I/O, unit-tested. House copy
// rules: no em dashes, one fact per line. The Resend wrapper adds the transport
// headers (List-Unsubscribe); these functions own subject + html + text + the
// URLs that carry the return token.

import { SITE_URL } from "@/lib/structured-data";
import { launchDirectionTip } from "@/lib/launchDirection";

// Verified sending domain (DECISIONS D5 / DNS verified 2026-07-10). The alias is
// a subdomain so alert-sender reputation is isolated from the root domain.
export const FROM = "Paddle to Water <conditions@alerts.paddletowater.com>";

// CAN-SPAM requires a physical postal address in every email (DECISIONS D5).
export const POSTAL_ADDRESS = "500 Folsom St, San Francisco, CA 94105";

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
  // Whether the launch-direction tip line was included (alert emails only), so
  // callers can count tip reach without re-deriving the gating logic.
  tipIncluded?: boolean;
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
// email_alert_opened can segment clicks by wording. `pt` is the technique-tip
// pool index (item 41) so opens can also be segmented by which tip rode along.
export function emailOpenUrl(
  spotId: number,
  token: string,
  variant?: number,
  techniqueTipIndex?: number
): string {
  const v = variant === undefined ? "" : `&v=${variant}`;
  const pt = techniqueTipIndex === undefined ? "" : `&pt=${techniqueTipIndex}`;
  return `${SITE_URL}/?spot=${spotId}&from=email&t=${encodeURIComponent(token)}${v}${pt}`;
}

// Branded, table-based email shell (item 68). Nested role="presentation" tables
// + fully inline styles are the only layout that renders in Gmail/Outlook/Apple
// Mail; no flex, no external CSS. The masthead wordmark is live HTML text (with a
// PNG logo badge that degrades to empty space when images are blocked, the
// default), so the email still reads as branded with images off. Dark mode is
// owned explicitly via the <style> media query rather than left to each client's
// auto-invert. Class names must avoid the word "calm" (a template test forbids
// it in the copy), hence ptw-card-good for the good-window callout.
function shell(bodyHtml: string, unsubUrl: string, preheader: string): string {
  const logo = `${SITE_URL}/email-logo.png`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>
    @media (prefers-color-scheme: dark) {
      .ptw-canvas { background:#0B2A47 !important; }
      .ptw-masthead { background:#123655 !important; border-bottom-color:#1D4A6E !important; }
      .ptw-card-good { background:#123655 !important; border-color:#155A54 !important; }
      .ptw-card-neutral { background:#0F3A5C !important; border-color:#1D4A6E !important; }
      .ptw-text { color:#F2F7FC !important; }
      .ptw-muted { color:#9DAEBD !important; }
      .ptw-border-top { border-top-color:#1D4A6E !important; }
    }
  </style></head>
  <body style="margin:0;padding:0;background:#EEF5FB;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0B2A47">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ptw-canvas" style="background:#EEF5FB"><tr><td align="center" style="padding:0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto">
      <tr><td class="ptw-masthead" style="background:#E3EEFA;border-bottom:1px solid #DCE7F0;padding:18px 24px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:10px;vertical-align:middle"><img src="${logo}" width="36" height="36" alt="" style="display:block;border:0;border-radius:8px"></td>
          <td style="vertical-align:middle"><span class="ptw-text" style="font-family:Georgia,'Times New Roman',Times,serif;font-size:22px;font-weight:700;color:#0B2A47;letter-spacing:-0.2px">Paddle to Water</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:26px 24px 6px">${bodyHtml}</td></tr>
      <tr><td class="ptw-border-top" style="border-top:1px solid #DCE7F0;padding:20px 24px 28px">
        <p class="ptw-muted" style="font-size:12px;color:#556A7E;line-height:1.5;margin:0 0 6px">Guidance only, not a safety guarantee. Conditions shift fast on the water.</p>
        <p class="ptw-muted" style="font-size:12px;color:#556A7E;line-height:1.5;margin:0 0 6px">You're getting this because you signed up for paddle alerts at paddletowater.com. <a href="${unsubUrl}" style="color:#0E6FD1">Unsubscribe</a></p>
        <p class="ptw-muted" style="font-size:11px;color:#556A7E;line-height:1.5;margin:0">Paddle to Water, ${POSTAL_ADDRESS}</p>
      </td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}

// Small uppercase kicker above a headline (item 68). Azure, letter-spaced.
function eyebrow(label: string): string {
  return `<p style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0E6FD1;margin:0 0 8px">${label}</p>`;
}

// Bulletproof (VML-free) padded button. Outlook desktop drops the border-radius
// and renders sharp corners; that is a working button, not a bug, do not add VML.
function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#0E6FD1;border-radius:8px"><a href="${url}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${label}</a></td></tr></table>`;
}

// The text/plain twin of shell()'s footer. shell() renders HTML only, so every
// text part shipped without the safety line, the CAN-SPAM postal address, or a
// visible unsubscribe (the RFC 8058 List-Unsubscribe header is set in sender.ts,
// but a header is not a visible opt-out). Caught by the legal gate 2026-07-16.
// Keep this in sync with shell(): if one footer gains a line, so does the other.
function textFooter(unsubUrl: string): string {
  return `\n\nGuidance only, not a safety guarantee. Conditions shift fast on the water.\n\nYou're getting this because you signed up for paddle alerts at paddletowater.com.\nUnsubscribe: ${unsubUrl}\nPaddle to Water, ${POSTAL_ADDRESS}`;
}

export function composeConfirmEmail(confirmToken: string, token: string): EmailMessage {
  const url = confirmUrl(confirmToken);
  const subject = "Confirm your Paddle to Water alerts";
  const html = shell(
    `${eyebrow("One more step")}
     <p class="ptw-text" style="font-size:21px;font-weight:700;line-height:1.3;color:#0B2A47;margin:0 0 10px">Confirm your alerts</p>
     <p class="ptw-text" style="font-size:14px;line-height:1.6;color:#0B2A47;margin:0 0 18px">You asked us to keep an eye on your paddling spots. Confirm and we'll email you when one is good to paddle.</p>
     ${button(url, "Confirm alerts")}
     <p class="ptw-muted" style="font-size:13px;color:#556A7E;line-height:1.5;margin:16px 0 0">At most one email a day, only when a spot's good to paddle. Didn't sign up? Ignore it: nothing happens.</p>`,
    unsubscribeUrl(token),
    "Confirm to start getting paddle alerts for your spots."
  );
  const text =
    `Confirm your Paddle to Water alerts.\n\nYou asked us to keep an eye on your paddling spots. Confirm and we'll email you when one is good to paddle:\n${url}\n\nAt most one email a day, only when a spot's good to paddle. Didn't sign up? Ignore it: nothing happens.` +
    textFooter(unsubscribeUrl(token));
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
  windDirection?: string; // NWS wind-FROM direction at the peak-wind hour, feeds the launch tip
  notes?: string; // put-in details from the spot
  extras: AlertExtra[]; // additional good spots beyond the first, already selected
  token: string;
  variant?: number; // 0-6 copy rotation index (alertVariantForDay); defaults to 0, the original wording
  techniqueTipIndex?: number; // 0-6 pro-tip pool index (techniqueTipForDay); defaults to 0
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
    subjectSingle: "{spot} looks good to paddle {weekday}",
    subjectMultiSameDay: "{count} spots look good to paddle {weekday}",
    subjectMultiSoon: "{count} spots look good to paddle soon",
    headline: "{spot} looks good to paddle {weekday}, {hours}.",
    bodyNoWind: "The forecast shows about a {lengthHours}-hour window.",
    bodyWithWind: "The forecast shows about a {lengthHours}-hour window, with wind topping out at {wind} mph.",
    cta: "See the forecast",
    preheaderNoWind: "{hours}, about a {lengthHours}-hour window.",
    preheaderWithWind: "{hours}, about a {lengthHours}-hour window, with wind topping out at {wind} mph.",
  },
  {
    name: "plain-report",
    subjectSingle: "Good window: {spot}, {weekday}",
    subjectMultiSameDay: "Good windows {weekday} at {count} spots",
    subjectMultiSoon: "Good windows ahead at {count} spots",
    headline: "{spot}: good window {weekday}, {hours}.",
    bodyNoWind: "About {lengthHours} hours, per the forecast.",
    bodyWithWind: "About {lengthHours} hours, per the forecast; wind peaks at {wind} mph.",
    cta: "Check conditions",
    preheaderNoWind: "Good window {weekday} {hours}, about {lengthHours} hours.",
    preheaderWithWind: "Good window {weekday} {hours}, about {lengthHours} hours; wind peaks at {wind} mph.",
  },
  {
    name: "friendly-local",
    subjectSingle: "{weekday} looks good at {spot}",
    subjectMultiSameDay: "{weekday} looks good at {count} of your spots",
    subjectMultiSoon: "{count} of your spots look good soon",
    headline: "{spot} looks good {weekday}, {hours}.",
    bodyNoWind: "The forecast has a {lengthHours}-hour stretch there.",
    bodyWithWind: "The forecast has a {lengthHours}-hour stretch there, with wind no higher than {wind} mph.",
    cta: "See the hours",
    preheaderNoWind: "Looks good {hours}, a {lengthHours}-hour stretch.",
    preheaderWithWind: "Looks good {hours}, a {lengthHours}-hour stretch, wind no higher than {wind} mph.",
  },
  {
    name: "hours-first",
    subjectSingle: "{spot}, {weekday} {hours} \u{1F30A}",
    subjectMultiSameDay: "{weekday} windows at {count} spots \u{1F30A}",
    subjectMultiSoon: "Windows coming at {count} spots \u{1F30A}",
    headline: "{spot}, {weekday} {hours}.",
    bodyNoWind: "That's the good window in the forecast, roughly {lengthHours} hours of it.",
    bodyWithWind: "That's the good window in the forecast, roughly {lengthHours} hours of it, wind at or below {wind} mph.",
    cta: "See the window",
    preheaderNoWind: "{weekday} {hours}: roughly {lengthHours} hours in the forecast.",
    preheaderWithWind: "{weekday} {hours}: roughly {lengthHours} hours, wind at or below {wind} mph.",
  },
  {
    name: "your-watchlist",
    subjectSingle: "A spot you watch: {spot}, {weekday}",
    subjectMultiSameDay: "{count} spots you watch look good {weekday}",
    subjectMultiSoon: "{count} spots you watch look good soon",
    headline: "You watch {spot}. It has a good window {weekday}, {hours}.",
    bodyNoWind: "The forecast gives it about {lengthHours} hours.",
    bodyWithWind: "The forecast gives it about {lengthHours} hours, with wind up to {wind} mph.",
    cta: "Open the spot",
    preheaderNoWind: "{weekday} {hours} at a spot you watch, about {lengthHours} hours.",
    preheaderWithWind: "{weekday} {hours} at a spot you watch, about {lengthHours} hours, wind up to {wind} mph.",
  },
  {
    name: "weather-nerd",
    subjectSingle: "Forecast: {spot} good to paddle {weekday}",
    subjectMultiSameDay: "Forecast: {count} spots good to paddle {weekday}",
    subjectMultiSoon: "Forecast: {count} spots good to paddle soon",
    headline: "Forecast says {spot} is good to paddle {weekday}, {hours}.",
    bodyNoWind: "A {lengthHours}-hour run in the hourly forecast.",
    bodyWithWind: "A {lengthHours}-hour run in the hourly forecast, peak wind {wind} mph.",
    cta: "See the numbers",
    preheaderNoWind: "{weekday} {hours}, a {lengthHours}-hour run in the hourly forecast.",
    preheaderWithWind: "{weekday} {hours}, a {lengthHours}-hour run, peak wind {wind} mph.",
  },
  {
    name: "pencil-it-in",
    subjectSingle: "Worth penciling in: {spot}, {weekday}",
    subjectMultiSameDay: "Worth penciling in {weekday}: {count} spots",
    subjectMultiSoon: "{count} spots worth penciling in",
    headline: "Worth penciling in: {spot}, {weekday}, {hours}.",
    bodyNoWind: "That's a {lengthHours}-hour window in the forecast to work with.",
    bodyWithWind: "That's a {lengthHours}-hour window in the forecast to work with, with wind maxing out at {wind} mph.",
    cta: "See spot details",
    preheaderNoWind: "Worth penciling in: {weekday} {hours}, a {lengthHours}-hour window.",
    preheaderWithWind: "Worth penciling in: {weekday} {hours}, a {lengthHours}-hour window, wind maxing out at {wind} mph.",
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

// ── Pro-tip rotation (ROADMAP item 41, owner idea 2026-07-16) ──
// One-sentence paddleboard TECHNIQUE tips, editor-written. House rule: tips
// teach skill, they never instruct action (no "head out now", no launch
// urgency, no safety guarantee): that collides with item 34, which strips
// inducement language out of these exact emails.
//
// EVERY TIP HERE MUST BE VERIFIED ACCURATE BEFORE IT SHIPS. This goes to real
// paddlers as advice from the site. Two candidate tips were cut on 2026-07-16
// rather than shipped unverified (owner call): a stroke-past-the-hip body
// position claim, and a "switch sides every few strokes" claim whose cadence
// varies by board type (all-around vs. displacement/touring with a skeg).
// Both are recoverable from git if a source confirms them. The rotation does
// not care about pool size, so adding a verified tip later is a one-line change.
export const TECHNIQUE_TIPS: readonly string[] = [
  "Bending your knees a little and keeping your feet about hip-width apart keeps a board far steadier than standing stiff-legged.",
  "SUP paddle blades are angled on purpose: tilting the blade forward, away from you, catches more water than tilting it back toward your feet.",
  "A wide sweep stroke on one side turns the nose without switching hands or paddling on the other side.",
  "Most of a stroke's power comes from twisting your torso into it, not just pulling with your arms.",
  "Looking out at the horizon instead of down at your feet is one of the easiest ways to hold your balance.",
];

export const TECHNIQUE_TIP_COUNT = TECHNIQUE_TIPS.length;

// Reuses alertVariantForDay, the exact rotation algorithm shipped 2026-07-13,
// instead of building a second one. A fixed day offset decorrelates which tip
// pairs with which wording variant (both pools happen to be size 7) so the two
// rotations are not perfectly confounded day over day.
const TECHNIQUE_TIP_DAY_OFFSET_MS = 3 * 86_400_000;

export function techniqueTipForDay(nowMs: number): number {
  return alertVariantForDay(nowMs + TECHNIQUE_TIP_DAY_OFFSET_MS) % TECHNIQUE_TIP_COUNT;
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

// HTML twin of extrasLine (item 68): a tinted card with one row per named spot,
// so the extras read as a scannable list instead of a run-on sentence. The
// text/plain part still uses extrasLine (a sentence is correct there). Heading
// distinguishes same-day extras ("today") from later-in-the-horizon ones ("soon").
function extrasCardHtml(extras: AlertEmailInput["extras"], allSameDay: boolean): string {
  if (extras.length === 0) return "";
  const heading = allSameDay ? "Also good today" : "Also good soon";
  const named = extras.slice(0, MAX_NAMED_EXTRAS);
  const more = extras.length - named.length;
  const rows = named
    .map((e, i) => {
      const padBottom = i === named.length - 1 && more === 0 ? "10px" : "0";
      const line = `${e.name}, ${weekdayFromKey(e.windowKey)} ${formatHourRange(e.startHour, e.endHour)}`;
      return `<tr><td class="ptw-text" style="padding:6px 14px ${padBottom};font-size:13px;color:#0B2A47;line-height:1.6">${escapeHtml(line)}</td></tr>`;
    })
    .join("");
  const moreRow =
    more > 0
      ? `<tr><td class="ptw-muted" style="padding:2px 14px 10px;font-size:13px;color:#556A7E;line-height:1.6">And ${more} more.</td></tr>`
      : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ptw-card-neutral" style="background:#F2F7FC;border:1px solid #DCE7F0;border-radius:8px;margin:0 0 14px"><tr><td style="padding:10px 14px 2px"><span style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#0E6FD1">${heading}</span></td></tr>${rows}${moreRow}</table>`;
}

export function composeAlertEmail(input: AlertEmailInput): EmailMessage {
  const {
    spotName,
    spotId,
    windowKey,
    startHour,
    endHour,
    maxWindMph,
    windDirection,
    notes,
    extras,
    token,
    variant,
    techniqueTipIndex,
  } = input;
  const v = ALERT_VARIANTS[((variant ?? 0) % ALERT_VARIANT_COUNT + ALERT_VARIANT_COUNT) % ALERT_VARIANT_COUNT];
  const proTip =
    TECHNIQUE_TIPS[
      ((techniqueTipIndex ?? 0) % TECHNIQUE_TIP_COUNT + TECHNIQUE_TIP_COUNT) % TECHNIQUE_TIP_COUNT
    ];
  const openUrl = emailOpenUrl(spotId, token, variant, techniqueTipIndex);
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
  const tip = launchDirectionTip(windDirection, maxWindMph);

  // Two distinct tips coexist here, do not collapse them into one.
  // `tip` (item 36) is contextual: it names today's launch direction from the
  // window's wind, and is omitted below 5 mph or when direction is unknown.
  // `proTipLine` (item 41) is generic technique that rotates daily and always
  // renders. Item 36's `tipIncluded` guardrail counts only the former.
  // Good-window callout: the window length (with wind folded in) plus the
  // optional launch-direction tip, together in one tinted box. This is the
  // email's reason to exist, so it carries the most visual weight.
  const tipInCallout = tip
    ? `<p class="ptw-muted" style="font-size:13px;line-height:1.5;color:#42607A;margin:6px 0 0">${escapeHtml(tip)}</p>`
    : "";
  const calloutHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ptw-card-good" style="background:#DBF3F0;border:1px solid #0E7F78;border-radius:8px;margin:0 0 14px"><tr><td style="padding:12px 14px"><p class="ptw-text" style="font-size:14px;font-weight:500;line-height:1.5;color:#0B2A47;margin:0">${escapeHtml(lengthLine)}</p>${tipInCallout}</td></tr></table>`;

  const proTipLine = `Pro tip: ${proTip}`;
  const proTipHtml = `<p class="ptw-muted" style="font-size:13px;line-height:1.5;color:#556A7E;margin:0 0 14px"><strong style="color:#0E6FD1">Pro tip:</strong> ${escapeHtml(proTip)}</p>`;
  const extrasHtml = extrasCardHtml(extras, allSameDay);
  const notesHtml = notes
    ? `<p class="ptw-muted" style="font-size:13px;line-height:1.5;color:#556A7E;margin:0 0 18px">${escapeHtml(notes)}</p>`
    : "";

  const html = shell(
    `${eyebrow("Paddle alert")}
     <p class="ptw-text" style="font-size:21px;font-weight:700;line-height:1.3;color:#0B2A47;margin:0 0 14px">${escapeHtml(headline)}</p>
     ${calloutHtml}
     ${proTipHtml}
     ${extrasHtml}
     ${notesHtml}
     ${button(openUrl, escapeHtml(v.cta))}`,
    unsubscribeUrl(token),
    preheader
  );

  const text =
    `${headline}\n\n${lengthLine}\n${tip ? `${tip}\n` : ""}${proTipLine}\n${extras.length ? `\n${extrasLine(extras)}\n` : ""}${notes ? `\n${notes}\n` : ""}\n${v.cta}: ${openUrl}` +
    textFooter(unsubscribeUrl(token));
  return { subject, html, text, tipIncluded: tip !== null };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
