import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf-8");

/**
 * Normalize the page into the prose a user actually reads, before scanning:
 *
 *  1. Strip comments. These tests assert what the page TELLS USERS, and the
 *     header comment documents the false claims caught pre-ship, so an
 *     unstripped scan matches the very wording it is meant to forbid.
 *  2. Collapse whitespace. JSX wraps prose across lines at arbitrary points, so
 *     "not\n  deleted automatically" is one sentence to a reader and two
 *     non-matching fragments to a regex. Both bugs bit while writing this file.
 */
const asProse = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\s+/g, " ");

const policySrc = read("app/privacy/page.tsx");
const policy = asProse(policySrc);

/**
 * A privacy policy is a factual claim about what the code does. Code drifts;
 * the policy does not follow on its own, and a policy that overstates what you
 * withhold is worse than none (it is the FTC Act §5 shape: promising a practice
 * you do not keep). These tests fail when the code stops matching the page.
 *
 * They are deliberately about CLAIMS, not wording. Rewrite the prose freely.
 *
 * Lives in lib/ because vitest.config.ts only includes lib/** and components/**;
 * a test under app/ silently never runs, which for THIS test would be worse than
 * having no test at all.
 */
describe("privacy policy matches what the code actually does", () => {
  it("claims location never leaves the device, so no track call may carry coordinates", () => {
    expect(policy).toMatch(/location stays on your device/i);
    const sources = ["components/HomeClient.tsx", "components/SpotList.tsx", "components/SpotDrawer.tsx"];
    for (const f of sources) {
      const src = read(f);
      // Find every analytics call and assert none mentions a coordinate.
      const calls = src.match(/track(Intent|System)\([^)]*\)/gs) ?? [];
      for (const call of calls) {
        expect(
          /\b(lat|lng|latitude|longitude|coords|userLocation)\b/.test(call),
          `${f}: an analytics call carries coordinates, which the privacy policy says never happens:\n${call}`
        ).toBe(false);
      }
    }
  });

  it("names every third party that actually processes data", () => {
    // If you add a subprocessor, name it on the page in the same commit.
    for (const name of ["Vercel", "Supabase", "PostHog", "Resend", "National Weather Service"]) {
      expect(policy, `privacy page must name ${name} as a processor`).toContain(name);
    }
  });

  it("discloses cookies, because PostHog persistence uses one", () => {
    const provider = read("components/PostHogProvider.tsx");
    const usesCookie = /persistence:\s*["'][^"']*cookie/.test(provider);
    expect(
      usesCookie,
      "PostHog no longer uses cookie persistence: the privacy page's cookie section is now wrong"
    ).toBe(true);
    expect(policy).toMatch(/cookie/i);
  });

  it("promises a working unsubscribe, so the route must exist", () => {
    expect(policy).toMatch(/unsubscribe/i);
    expect(fs.existsSync(path.join(ROOT, "app/api/email/unsubscribe/route.ts"))).toBe(true);
  });

  it("does not claim unsubscribe deletes, because it does not", () => {
    // The first draft of this page said unsubscribe "deletes your subscription".
    // The route sets enabled=false + an unsub_at churn stamp and keeps the row,
    // deliberately: unsub_at feeds the reachable-audience metric in
    // analytics/queries/enrollment_return_funnel.sql. The lawyer gate caught the
    // false claim pre-ship. This test is that catch, made permanent.
    const route = read("app/api/email/unsubscribe/route.ts");
    const actuallyDeletes = /\.delete\(\)/.test(route);
    if (!actuallyDeletes) {
      expect(
        /unsubscrib\w*[^.]{0,80}delet/i.test(policy),
        "privacy page implies unsubscribe deletes, but the route only sets enabled=false"
      ).toBe(false);
      // It must instead say the record is kept, and offer deletion on request.
      expect(policy).toMatch(/not deleted automatically/i);
      expect(policy).toMatch(/ask us and we will delete it|ask, and it is gone/i);
    }
  });

  it("does not promise Do Not Track unless PostHog actually respects it", () => {
    // posthog-js defaults respect_dnt to false. The first draft told users to opt
    // out via DNT, which was simply false. CalOPPA 22575(b)(5) requires a DNT
    // DISCLOSURE, not DNT compliance, so saying "we do not respond to it" is
    // both honest and sufficient.
    const provider = read("components/PostHogProvider.tsx");
    const respectsDnt = /respect_dnt:\s*true/.test(provider);
    if (!respectsDnt) {
      expect(
        /use your browser's Do Not Track|opt out.{0,40}Do Not Track/i.test(policy),
        "privacy page tells users to opt out via DNT, but respect_dnt is not enabled"
      ).toBe(false);
      expect(
        policy,
        "CalOPPA requires a DNT disclosure: say plainly that the site does not respond to it"
      ).toMatch(/does not currently respond to it/i);
    }
  });

  it("gives a contact address that matches the one users already reply to", () => {
    const sender = read("lib/email/sender.ts");
    const replyTo = sender.match(/EMAIL_REPLY_TO\s*\|\|\s*"([^"]+)"/)?.[1];
    expect(replyTo, "could not find the reply-to fallback in lib/email/sender.ts").toBeTruthy();
    expect(
      policy.includes(replyTo!),
      `privacy page must use the same contact address as the alert emails (${replyTo})`
    ).toBe(true);
  });

  it("is reachable: linked from both footers", () => {
    expect(read("components/HomeClient.tsx")).toContain('href="/privacy"');
    expect(read("components/SpotList.tsx")).toContain('href="/privacy"');
  });

  it("does not claim an account system that does not exist yet", () => {
    // Item 44 is not shipped. If/when it is, this page needs a sign-in section
    // and this test should be replaced, not deleted.
    const hasAuth = fs.existsSync(path.join(ROOT, "lib/auth.ts"));
    if (!hasAuth) {
      expect(policy).toMatch(/without an account/i);
    }
  });

  it("follows house style: no em dashes", () => {
    expect(policy).not.toContain("—");
  });

  it("names subscription management as a purpose, since the app reads subscription state to decide whether to prompt", () => {
    expect(policy).toMatch(/manage your subscription/i);
    expect(policy).toMatch(/not asking again for an address we already have/i);
    expect(policy).toMatch(/to let you stop it/i);
    expect(policy).toMatch(/We do not use any of it for anything else/i);
    // "exist for one purpose" is now false: there are three. Do not let it come back.
    expect(policy).not.toMatch(/exist for one purpose/i);
  });

  it("claims the email address is never returned to the browser, so the open-ping route must never send it back", () => {
    const route = read("app/api/email/opened/route.ts");
    expect(route).not.toContain('.select("email"');
    expect(route).not.toMatch(/json\(\{[^}]*email/i);
  });
});
