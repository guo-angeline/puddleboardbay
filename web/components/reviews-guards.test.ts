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
// Every component + page source, so an absence guard is proven against the
// tree rather than against the files someone remembered to list.
const sweep = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.resolve(__dirname, dir), { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) out.push(rel);
    }
  };
  walk(".");
  walk("../app");
  return out;
};
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

describe("no TEXT publishes without a human (item 43, amended item 79)", () => {
  // Item 79 (owner, 2026-07-21) narrowed D24's "no auto-publish ever": a rating
  // with NO text publishes immediately, because pre-publication review exists to
  // catch defamatory or abusive WORDS and a bare number has none. The half that
  // must never loosen is that anything with text is still held for a human.
  it("routes on the presence of text, and text is always held", () => {
    expect(submitRoute).toMatch(/const hasText = typeof body === "string" && body\.trim\(\) !== ""/);
    expect(submitRoute).toMatch(/const status = hasText \? "pending" : "published"/);
  });

  it("never publishes text automatically, whatever else changes", () => {
    // If someone ever inverts the ternary or hardcodes published, this bites.
    expect(submitRoute).not.toMatch(/hasText \? "published"/);
    expect(submitRoute).not.toMatch(/status:\s*"published"\s*,/);
  });

  it("only mails the moderator when there is actually a decision to make", () => {
    expect(submitRoute).toMatch(/if \(hasText\) \{[\s\S]*sendOperatorEmail/);
  });

  it("an auto-published rating carries NO byline", () => {
    // The display name is contributor-typed free text. On the auto-publish path
    // no human sees it before it is live, so publishing it would contradict the
    // v1.1 s6.1 rationale that nothing written reaches the page unreviewed.
    expect(submitRoute).toContain("display_name: hasText ? displayName : null");
  });

  it("refuses a submission stamped with a terms version we are not serving", () => {
    // A cached bundle would otherwise stamp the assent record with text the
    // contributor never saw, at exactly the moment a version boundary exists.
    expect(submitRoute).toContain("termsVersion !== TERMS_VERSION");
    expect(submitRoute).toMatch(/status: 409/);
  });

  it("the amended promise is the one users assent to (version bumped)", () => {
    // The stored terms hash must move whenever s6.1 changes in substance, or the
    // assent record points at text the contributor never saw.
    expect(fs.readFileSync(path.resolve(__dirname, "../lib/reviews/validation.ts"), "utf-8"))
      .toContain('TERMS_VERSION = "v1.1"');
    expect(form).toContain('TERMS_HASH = "ugc-v1.1-2026-07-21"');
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
    const drawer = read("./SpotDrawer.tsx");
    expect(drawer).toContain("SignInSheet");
    expect(drawer).toMatch(/else setSignInFor\(spot!\.id\)/);
  });
});

describe("the section stays hidden until a spot earns one (item 43)", () => {
  it("renders nothing when there are no published reviews", () => {
    expect(section).toMatch(/if \(!hasReviews && !formOpen && !justSubmitted\) return null;/);
  });

  it("has no empty state left to show", () => {
    expect(section).not.toContain("No reviews yet");
  });

  it("still renders when the form is open, so the trigger is not a dead tap", () => {
    // The trigger lives in SpotDrawer's action row; the form renders in here.
    // If the null-return ever stops excepting formOpen, tapping Review does
    // nothing at all on the 140 spots that have no reviews yet.
    expect(section).toContain("formOpen");
    expect(section).toMatch(/\{formOpen && \(\s*<ReviewForm/);
  });
});

describe("the form carries no copy the owner cut (item 43)", () => {
  const form2 = read("./ReviewForm.tsx");

  it("drops the pre-submit guidance and moderation notice", () => {
    expect(form2).not.toContain("Write what you saw");
    expect(form2).not.toContain("Nothing publishes automatically");
  });

  it("keeps the moderation promise where it is still made", () => {
    // Cutting the notice from the form is a copy decision, not a policy one:
    // /privacy still states it, and the post-submit confirmation still tells
    // the submitter. If both of those ever go, the promise is unstated.
    expect(section).toContain("goes to a person for review before it appears");
    expect(read("../app/privacy/page.tsx")).toContain("read by a person before it appears");
  });

  it("tells the truth about BOTH paths after item 79", () => {
    // A text-less rating goes live at once; saying it was "sent for review"
    // would be a false statement to the contributor.
    expect(section).toContain("Thanks. Your rating is live.");
    expect(section).toMatch(/justSubmitted === "published"/);
    // And the published terms + privacy must disclose the immediate path.
    expect(read("../app/privacy/page.tsx")).toContain("appears immediately");
    expect(read("../app/contributor-terms/page.tsx")).toContain("appears immediately");
  });

  it("submits with the short label", () => {
    expect(form2).toMatch(/busy \? "Sending…" : "Review"/);
  });
});

describe("Review is a primary CTA, not a stray control (item 43, restyled 2026-07-21)", () => {
  const drawer = read("./SpotDrawer.tsx");
  const flat = drawer.replace(/\s+/g, " ");

  it("gets its own full-width row in the filled-accent treatment Watch uses", () => {
    // Owner direction 2026-07-21: Review is promoted out of the half-width
    // outline pair and given Watch's filled-accent look. Assert the fill
    // itself, so downgrading Review back to an outline fails here.
    const FILL = '{ borderColor: "transparent", color: "#fff", background: "var(--accent)" }';
    // Watch's unsaved branch + Review. Watch writes it inside a ternary, so
    // match the object literal, not the whole style= attribute.
    expect(flat.split(FILL).length - 1).toBe(2);
    expect(flat).toContain(
      'className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold border transition-colors" ' +
      "style={" + FILL + "} > Write a review <"
    );
  });

  it("leaves Share as the only half-width accent-outline control", () => {
    // Counting is what makes the guard bite: restyle Share, or restore a
    // second outline peer next to it, and this moves off 1.
    const OUTLINE =
      'className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50" ' +
      'style={{ borderColor: "var(--accent)", color: "var(--accent)" }}';
    expect(flat.split(OUTLINE).length - 1).toBe(1);
  });

  it("pairs Share with Get directions in the bottom row, Share first", () => {
    // Match rendered labels, not prose: the section comment above these
    // buttons names them too, and would satisfy a naive indexOf.
    expect(flat.indexOf('"Copied!" : "Share"')).toBeGreaterThan(flat.indexOf("> Write a review <"));
    expect(flat.indexOf("> Get directions <")).toBeGreaterThan(flat.indexOf('"Copied!" : "Share"'));
  });

  it("has no Photos button (removed 2026-07-21) on any surface", () => {
    // Sweep every component/page, not just the drawer: the button's absence is
    // only real if no file renders it and nothing still logs its event.
    for (const f of sweep()) {
      const src = read(f);
      expect(src, f).not.toMatch(/>\s*Photos\s*</);
      expect(src, f).not.toContain('action: "photos"');
      expect(src, f).not.toContain("photosUrl");
    }
  });

  it("is labelled 'Write a review', and the trigger lives only in the action row", () => {
    expect(drawer).toMatch(/>\s*Write a review\s*</);
    // The reviews section must not grow a second trigger: item 43 moved the
    // lone button out of it, and two triggers would double-count the event.
    expect(section).not.toMatch(/>\s*Write a review\s*</);
  });

  it("scrolls the form into view, since the trigger is not next to it", () => {
    expect(drawer).toContain("scrollIntoView");
  });
});

describe("reviews are reversible without a redeploy (item 43)", () => {
  it("both the list and the crowd number sit behind the same kill switch", () => {
    expect(section).toContain('useKillSwitch("reviews")');
    expect(section).toMatch(/if \(!authEnabled \|\| !reviewsOn\) return null;/);
    const drawer = read("./SpotDrawer.tsx");
    expect(drawer).toContain('useKillSwitch("reviews")');
    // A hidden list with a visible average would strand a number with no source.
    expect(drawer).toMatch(/const crowd = spot && reviewsOn \? aggregates\[spot\.id\] : undefined;/);
  });
});
