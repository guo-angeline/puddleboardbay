import { describe, it, expect } from "vitest";
import { composeAlert } from "@/lib/alerts/select";
import { composeAlertEmail, composeConfirmEmail, ALERT_VARIANTS } from "@/lib/email/templates";
import { launchDirectionTip } from "@/lib/launchDirection";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf-8");
const asProse = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ").replace(/\s+/g, " ");

/**
 * ITEM 34. These alerts are the site's ONE affirmative "conditions are good"
 * representation, and its central legal risk is a wrongful-death claim from
 * someone who paddled because the site said conditions looked good. The lawyer
 * gate called removing the inducement the cheapest meaningful reduction in that
 * exposure, and roughly 90% of this item's value (the appended caveat is the
 * other 10%).
 *
 * The copy shipped before this was "Time to launch" / "{spot} looks good right
 * now. Go while it lasts." on the push that fires AT window open. That is a
 * time-pressured directive to get on the water, at the moment of the decision.
 *
 * These tests exist so that never comes back by accident. They assert INTENT
 * (no directive, no urgency), not exact wording. Rewrite the copy freely.
 */

/**
 * Imperatives telling the reader to go paddle, or to go a particular way.
 *
 * NOTE ON HOW THIS LIST FAILED ONCE, because it will try to fail this way again:
 * the first version listed `head out now` but not `head out`, and the live
 * directive was "Head out toward the {direction} so the wind helps push you
 * back." (lib/launchDirection.ts). It shipped on the email and the interstitial,
 * one line ABOVE the safety disclaimer, and this suite passed. The list had been
 * written against the copy its author remembered changing, not against a grep of
 * the tree. When adding a surface, grep it; do not assume this list covers it.
 */
const DIRECTIVES = [
  /\btime to launch\b/i,
  /\bgo while it lasts\b/i,
  /\bget on the water\b/i,
  /\bhead out\b/i,
  /\bhead over\b/i,
  /\blaunch now\b/i,
  /\bgo now\b/i,
  /\bdon'?t miss\b/i,
  /\bmake sure you\b/i,
];

/**
 * Promises about the paddler's outcome. Distinct from a directive and arguably
 * worse: "so the wind helps push you back" is an affirmative representation that
 * they will be able to RETURN, derived from one peak-wind number, knowing
 * nothing about tide, current, geography, or skill. Failing to get back is the
 * precise failure mode in offshore-wind SUP incidents.
 */
const OUTCOME_PROMISES = [
  /\bhelps? push you back\b/i,
  /\byou'?ll be fine\b/i,
  /\beasy (paddle|return|trip)\b/i,
  /\bsafe to\b/i,
];

/** Manufactured scarcity: pressure on a decision that should be unhurried. */
const URGENCY = [
  /\bwhile it lasts\b/i,
  /\bhurry\b/i,
  /\bact fast\b/i,
  /\blast chance\b/i,
  /\bwon'?t last\b/i,
  /\bright now\b.*\bgo\b/i,
];

const SAFETY_LINE = "Conditions shift fast on the water.";

describe("item 34: alert copy cannot read as an instruction to launch", () => {
  const win = {
    spotId: 2,
    spotName: "Foster City Lagoons",
    label: "Saturday",
    windowKey: "2026-07-11",
  };

  it("the evening push carries no directive and no urgency", () => {
    const { title, body } = composeAlert([win], "tok");
    for (const re of [...DIRECTIVES, ...URGENCY]) {
      expect(`${title} ${body}`, `alert copy matched ${re}`).not.toMatch(re);
    }
  });

  it("the evening push attributes to the forecast rather than asserting a fact", () => {
    const { title } = composeAlert([win], "tok");
    expect(title).toMatch(/forecast/i);
  });

  it("the evening push carries the safety half-line, and carries it LAST", () => {
    // Last on purpose: a long spot name should clip the caveat, never the hours.
    // A truncated disclaimer fails the conspicuousness test while proving you
    // knew one was needed.
    const { body } = composeAlert([win], "tok");
    expect(body).toContain(SAFETY_LINE);
    expect(body.trim().endsWith(SAFETY_LINE)).toBe(true);
  });

  it("the launch-time reminder push carries no directive (it was the worst offender)", () => {
    const src = asProse(read("app/api/cron/send-reminders/route.ts"));
    // Only look at the string literals it sends, not the comments explaining the fix.
    const literals = src.match(/title: "[^"]*"|body: `[^`]*`/g)?.join(" ") ?? "";
    expect(literals.length, "could not find the reminder push copy").toBeGreaterThan(0);
    for (const re of [...DIRECTIVES, ...URGENCY]) {
      expect(literals, `reminder push copy matched ${re}`).not.toMatch(re);
    }
    expect(literals).toContain(SAFETY_LINE);
  });

  it("the launch-direction tip reports the wind, it does not instruct or promise", () => {
    // This module composes user-facing alert prose and was missed by the first
    // pass, which is exactly why file coverage beats a longer regex list.
    const tip = launchDirectionTip("WNW", 12);
    expect(tip, "expected a tip at 12mph WNW").toBeTruthy();
    for (const re of [...DIRECTIVES, ...URGENCY, ...OUTCOME_PROMISES]) {
      expect(tip!, `launch tip matched ${re}`).not.toMatch(re);
    }
    // The useful geometry must survive: it is the reason the tip exists.
    expect(tip!).toMatch(/west-northwest/);
  });

  it("no email variant contains a directive or urgency", () => {
    for (const v of ALERT_VARIANTS) {
      const all = Object.values(v).join(" ");
      for (const re of [...DIRECTIVES, ...URGENCY]) {
        expect(all, `email variant "${v.name}" matched ${re}`).not.toMatch(re);
      }
    }
  });

  it("every email carries the canonical safety line in the footer", () => {
    const msg = composeAlertEmail({
      spotName: "Richardson Bay",
      spotId: 7,
      windowKey: "2026-07-11",
      startHour: 7,
      endHour: 10,
      maxWindMph: 6,
      extras: [],
      token: "tok7",
    });
    expect(msg.html).toContain("Guidance only, not a safety guarantee.");
    expect(msg.html).toContain(SAFETY_LINE);
  });

  it("the interstitial carries the canonical line and names the window, not the act", () => {
    const src = asProse(read("components/AlertInterstitial.tsx"));
    expect(src).toContain("Guidance only, not a safety guarantee. Conditions shift fast on the water.");
    // "Remind me at launch time" / "when it's time to launch" are the same
    // sentence as the killed "Time to launch", in the future tense.
    expect(src).not.toMatch(/time to launch/i);
    expect(src).toMatch(/when the window opens/i);
  });

  it("the enrollment card carries the canonical line, so consent is informed", () => {
    const src = asProse(read("components/InstallPrompt.tsx"));
    expect(src).toContain("Guidance only, not a safety guarantee. Conditions shift fast on the water.");
  });

  it("there is exactly ONE safety wording across the site, never a competing second", () => {
    // ConditionsPanel is where this line originated; every other surface quotes
    // it verbatim. A near-identical second wording would be worse than one.
    expect(asProse(read("components/ConditionsPanel.tsx"))).toContain(
      "Guidance only, not a safety guarantee. Conditions shift fast on the water."
    );
  });

  it("no module composing alert prose contains a directive or an outcome promise", () => {
    // File-level sweep. The point is coverage, not the regex list: a new surface
    // added to this array is a new surface actually checked.
    const PROSE_MODULES = [
      "lib/launchDirection.ts",
      "lib/alerts/select.ts",
      "lib/email/templates.ts",
      "app/api/cron/send-reminders/route.ts",
      "components/AlertInterstitial.tsx",
    ];
    for (const f of PROSE_MODULES) {
      const literals = asProse(read(f)).match(/"[^"]{12,}"|`[^`]{12,}`/g)?.join(" ") ?? "";
      for (const re of [...DIRECTIVES, ...URGENCY, ...OUTCOME_PROMISES]) {
        expect(literals, `${f} contains copy matching ${re}`).not.toMatch(re);
      }
    }
  });

  it("the email TEXT part carries the safety line, not just the HTML", () => {
    // shell() is HTML-only, so every text/plain MIME alternative shipped with no
    // safety line, no postal address, and no visible unsubscribe. The first
    // version of this suite asserted msg.html only, which is how that passed.
    const msg = composeAlertEmail({
      spotName: "Richardson Bay", spotId: 7, windowKey: "2026-07-11",
      startHour: 7, endHour: 10, maxWindMph: 6, extras: [], token: "tok7",
    });
    expect(msg.text).toContain("Guidance only, not a safety guarantee.");
    expect(msg.text).toContain(SAFETY_LINE);
    expect(msg.text).toContain("500 Folsom");
    expect(msg.text).toContain("/api/email/unsubscribe");

    const confirm = composeConfirmEmail("ctok", "utok");
    expect(confirm.text).toContain("Guidance only, not a safety guarantee.");
    expect(confirm.text).toContain("500 Folsom");
  });

  it("keeps item 28's vocabulary: 'calm' is the wind scale, never the promise", () => {
    for (const v of ALERT_VARIANTS) {
      expect(Object.values(v).join(" "), `variant "${v.name}" leaks "calm" as the promise`).not.toMatch(/calm/i);
    }
  });

  it("keeps item 27's win: the exact hours and peak wind survive the reframe", () => {
    const msg = composeAlertEmail({
      spotName: "Richardson Bay",
      spotId: 7,
      windowKey: "2026-07-11",
      startHour: 7,
      endHour: 10,
      maxWindMph: 6,
      extras: [],
      token: "tok7",
    });
    // Reframing must not regress to vague. Item 27 fought to get these in.
    expect(msg.text).toContain("7 to 10am");
    expect(msg.text).toMatch(/6 mph/);
  });
});
