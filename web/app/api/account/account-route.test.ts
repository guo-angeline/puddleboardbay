import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Item 78. The account resource is legally load-bearing (self-service deletion
// of personal data). These guard the parts that a later edit would quietly
// break in a way that is invisible until someone's data is mishandled.
const route = fs.readFileSync(path.resolve(__dirname, "./route.ts"), "utf-8");

describe("account deletion follows the runbook (item 78)", () => {
  it("does NOT hard-delete reviews: it unpublishes and strips the byline", () => {
    // Terms 3.3 retains the moderation record for three years. A cascade or a
    // .delete() on spot_reviews would destroy it.
    expect(route).toMatch(/spot_reviews[\s\S]*?\.update\(\{ status: "removed", display_name: null \}\)/);
    expect(route).not.toMatch(/from\("spot_reviews"\)\s*\.delete\(\)/);
  });

  it("deletes both alert subscriptions, so deletion actually stops the mail", () => {
    expect(route).toMatch(/from\("email_subscriptions"\)\s*\.delete\(\)/);
    expect(route).toMatch(/from\("push_subscriptions"\)\s*\.delete\(\)/);
  });

  it("removes the auth user last, which cascades the saved spots", () => {
    expect(route).toContain("admin.auth.admin.deleteUser(user.id)");
  });
});

describe("ownership is never taken from the request (item 78)", () => {
  it("every handler resolves the user from the verified session", () => {
    // requireUser() uses the cookie-bound auth client's getUser(); the id is
    // never read from a body or query param.
    expect(route).toContain("requireUser");
    expect(route).toContain("getServerAuthSupabase");
    // The mutations scope to user.id, not to a client-supplied id.
    expect(route).toMatch(/\.eq\("user_id", user\.id\)/);
    expect(route).not.toMatch(/body\.\w*[Uu]serId/);
  });

  it("refuses unauthenticated callers on every method", () => {
    // One 401 per handler (GET, PATCH, DELETE).
    expect(route.match(/status: 401/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("a rename reaches existing reviews (item 78)", () => {
  it("propagates the byline to the user's own review rows", () => {
    expect(route).toMatch(/from\("spot_reviews"\)\s*\.update\(\{ display_name:/);
    // Blank name clears the byline rather than writing "" as a name.
    expect(route).toContain('name === "" ? null : name');
  });

  it("validates the name server-side, not just in the form", () => {
    expect(route).toContain("validateDisplayName");
  });
});
