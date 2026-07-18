import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "InstallPrompt.tsx"), "utf-8");

const EXPECTED_TRIGGERS = [
  "first_save",
  "standalone_relaunch",
  "return_session",
  "conditions_interest",
  "manual",
];

function literalsFor(re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out.push(m[1]);
  }
  return out;
}

describe("InstallPrompt suppresses the email re-prompt for confirmed subscribers (item 47)", () => {
  it("gates every setTrigger literal with a matching suppressedByEmail call (set equality)", () => {
    const setTriggerLiterals = new Set(literalsFor(/setTrigger\(\s*"([a-z_]+)"/g));
    const suppressedByEmailLiterals = new Set(literalsFor(/suppressedByEmail\(\s*"([a-z_]+)"/g));
    expect(suppressedByEmailLiterals).toEqual(setTriggerLiterals);
  });

  it("covers exactly the four auto-triggers plus manual", () => {
    const suppressedByEmailLiterals = new Set(literalsFor(/suppressedByEmail\(\s*"([a-z_]+)"/g));
    expect(suppressedByEmailLiterals).toEqual(new Set(EXPECTED_TRIGGERS));
  });

  it("imports isEmailConfirmed from the subscription-state module", () => {
    expect(src).toContain('isEmailConfirmed');
    expect(src).toMatch(/import\s*{[^}]*isEmailConfirmed[^}]*}\s*from\s*"@\/lib\/email\/subscriptionState"/);
  });

  it("emits trackSystem(\"enrollment_prompt_suppressed\" with reconciled_this_session and a platform fallback of unknown", () => {
    expect(src).toContain('trackSystem("enrollment_prompt_suppressed"');
    expect(src).toContain("reconciled_this_session");
    expect(src).toContain('?? "unknown"');
  });

  it("orders each gate as: readStashedSubscription check, then suppressedByEmail, then setTrigger", () => {
    for (const trigger of EXPECTED_TRIGGERS) {
      const suppressedIdx = src.indexOf(`suppressedByEmail("${trigger}"`);
      const setTriggerIdx = src.indexOf(`setTrigger("${trigger}"`);
      expect(suppressedIdx, `suppressedByEmail("${trigger}" not found`).toBeGreaterThan(-1);
      expect(setTriggerIdx, `setTrigger("${trigger}" not found`).toBeGreaterThan(-1);

      // Nearest preceding readStashedSubscription() call before the suppressedByEmail call.
      const precedingSrc = src.slice(0, suppressedIdx);
      const readStashedIdx = precedingSrc.lastIndexOf("readStashedSubscription()");
      expect(readStashedIdx, `no preceding readStashedSubscription() before suppressedByEmail("${trigger}"`).toBeGreaterThan(-1);

      expect(suppressedIdx).toBeGreaterThan(readStashedIdx);
      expect(setTriggerIdx).toBeGreaterThan(suppressedIdx);
    }
  });

  it("dedupes the suppression event through a suppressedRef Set, guarded by !has(", () => {
    expect(src).toMatch(/suppressedRef\s*=\s*useRef\(new Set/);
    expect(src).toMatch(/!suppressedRef\.current\.has\(/);
    // The trackSystem call must sit inside the !has(...) branch.
    const hasIdx = src.indexOf("!suppressedRef.current.has(");
    const trackIdx = src.indexOf('trackSystem("enrollment_prompt_suppressed"');
    expect(hasIdx).toBeGreaterThan(-1);
    expect(trackIdx).toBeGreaterThan(hasIdx);
  });

  it("the manual gate sets the static terminal state and both terminal strings ship verbatim", () => {
    expect(src).toContain("setYoureSet(true)");
    expect(src).toContain("You&rsquo;re set.");
    expect(src).toContain("We&rsquo;ll email you when your spots are good to paddle.");
  });

  it("does not add an 'Add push' button, and carries no experiment plumbing", () => {
    // D18 deferred the email-subscriber push upgrade (item 49); no "Add push"
    // button was added. Item 32's dual-CTA experiment was retired to 100%
    // 2026-07-17, so the component now has no useExperiment call at all.
    expect(src).not.toContain("Add push");
    const matches = src.match(/useExperiment\(/g) || [];
    expect(matches.length).toBe(0);
  });

  it("gates return_session and conditions_interest behind the eligibility check (opted-out / saves), not before it, so the guardrail only counts a real would-have-shown suppression", () => {
    for (const trigger of ["return_session", "conditions_interest"]) {
      const suppressedIdx = src.indexOf(`suppressedByEmail("${trigger}"`);
      expect(suppressedIdx, `suppressedByEmail("${trigger}" not found`).toBeGreaterThan(-1);
      // Scope the search to THIS gate's own block: from its nearest preceding
      // readStashedSubscription() call up to the suppressedByEmail call. A
      // whole-file lastIndexOf would match an earlier, unrelated gate's
      // "optedOut" declaration and pass even when this gate checks eligibility
      // too late (the exact bug being guarded against).
      const readStashedIdx = src.slice(0, suppressedIdx).lastIndexOf("readStashedSubscription()");
      expect(readStashedIdx, `no preceding readStashedSubscription() before suppressedByEmail("${trigger}"`).toBeGreaterThan(-1);
      const localBlock = src.slice(readStashedIdx, suppressedIdx);
      expect(localBlock, `no eligibility (optedOut) check between readStashedSubscription() and suppressedByEmail("${trigger}"`).toContain("optedOut");
    }
  });

  it("does not fire alert_optin_dismissed for the youreSet terminal card (no matching impression, no fabricated trigger)", () => {
    const dismissedIdx = src.indexOf('trackIntent("alert_optin_dismissed"');
    expect(dismissedIdx).toBeGreaterThan(-1);
    const precedingSrc = src.slice(0, dismissedIdx);
    const guardIdx = precedingSrc.lastIndexOf("if (platform");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(src.slice(guardIdx, dismissedIdx)).toContain("!youreSet");
  });
});
