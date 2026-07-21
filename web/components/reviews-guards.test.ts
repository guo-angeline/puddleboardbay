import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Item 43. These guard the parts that are legally load-bearing or that a
// well-meaning later edit would quietly break.
const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
const form = read("./ReviewForm.tsx");
const section = read("./ReviewsSection.tsx");
const submitRoute = read("../app/api/reviews/route.ts");
const moderateRoute = read("../app/api/reviews/moderate/route.ts");
const aggRoute = read("../app/api/reviews/aggregates/route.ts");
const card = read("./SpotCard.tsx");
const migration = fs.readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/20260722_reviews.sql"),
  "utf-8"
);

describe("assent is captured properly (item 43)", () => {
  it("checkbox starts UNCHECKED and submit is blocked until it is ticked", () => {
    expect(form).toMatch(/useState\(false\);?\s*\/\/ NEVER default true/);
    expect(form).toMatch(/disabled=\{busy \|\| rating < 1 \|\| !agreed\}/);
  });

  it("uses the exact required label with the terms linked inside it", () => {
    expect(form).toContain("I have read and agree to the");
    expect(form).toContain('href="/contributor-terms"');
  });

  it("sends the terms version and a hash of what was shown", () => {
    expect(form).toContain("termsVersion: TERMS_VERSION");
    expect(form).toContain("termsHash: TERMS_HASH");
  });
});

describe("nothing publishes without a human (item 43)", () => {
  it("submissions always land pending", () => {
    expect(submitRoute).toContain('status: "pending"');
    expect(submitRoute).not.toMatch(/status:\s*"published"/);
  });

  it("the public read path returns published rows only, and never a user_id", () => {
    expect(submitRoute).toMatch(/\.eq\("status", "published"\)/);
    expect(submitRoute).not.toMatch(/select\([^)]*user_id/);
  });

  it("submitting requires sign-in", () => {
    expect(submitRoute).toContain("getRequestUserId");
    expect(submitRoute).toMatch(/status: 401/);
  });

  it("a moderation decision is single-use, so a replayed link cannot flip it", () => {
    expect(moderateRoute).toMatch(/\.eq\("status", "pending"\)/);
  });
});

describe("crowd rating only appears once it means something (item 43)", () => {
  it("holds the aggregate back below the cleared threshold", () => {
    expect(aggRoute).toMatch(/MIN_REVIEWS_FOR_AGGREGATE = 5/);
    expect(aggRoute).toMatch(/if \(t\.count < MIN_REVIEWS_FOR_AGGREGATE\) continue;/);
  });

  it("always shows the count alongside the average, never a bare star", () => {
    expect(card).toMatch(/\{crowd\.count\}/);
  });

  it("falls back to the owner rating when there is no crowd number", () => {
    expect(card).toMatch(/\) : typeof spot\.owner_rating === "number" \? \(/);
  });
});

describe("deleting an account keeps the promise (item 43)", () => {
  it("reviews are set-null, not cascade, so the moderation record survives", () => {
    expect(migration).toMatch(/user_id\s+uuid references auth\.users \(id\) on delete set null/);
    expect(migration).not.toMatch(/user_id[^\n]*on delete cascade/);
  });

  it("only published rows are publicly readable", () => {
    expect(migration).toContain("for select using (status = 'published')");
  });
});

describe("signed-out users get a way in, not a wall (item 43)", () => {
  it("opens the sign-in sheet instead of dead-ending", () => {
    expect(section).toContain("SignInSheet");
    expect(section).toMatch(/else setSignInOpen\(true\)/);
  });
});
