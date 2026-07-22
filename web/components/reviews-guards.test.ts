import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { confirmation } from "@/lib/markCopy";

// Item 43. These guard the parts that are legally load-bearing or that a
// well-meaning later edit would quietly break.
const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
const form = read("./ReviewForm.tsx");
const section = read("./ReviewsSection.tsx");
const submitRoute = read("../app/api/reviews/route.ts");
const moderateRoute = read("../app/api/reviews/moderate/route.ts");
const aggRoute = read("../app/api/reviews/aggregates/route.ts");
const card = read("./SpotCard.tsx");
const markCopy = read("../lib/markCopy.ts");
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
      .toContain('TERMS_VERSION = "v1.3"');
    expect(form).toContain('TERMS_HASH = "ugc-v1.3-2026-07-21"');
    // v1.2 (2026-07-21): s6.4 had to change because the displayed score is now
    // computed by us and blends our own rating in. Leaving the old text live
    // would have kept a published promise ("an automated calculation from
    // contributor-supplied ratings") that the product no longer honours.
    const terms = read("../app/contributor-terms/page.tsx");
    expect(terms).toContain("Version 1.3");
    // v1.3 (2026-07-21, item 83): marks are an incentive to contribute, so the
    // terms must say what they are given for and that it is never sentiment.
    // Shipping the incentive without the clause is the FTC exposure.
    expect(terms).toContain("Marks are for taking part, never for your opinion");
    // The rejection standard is the FTC-load-bearing half of v1.3. Marks are
    // conditioned on a review NOT being rejected, so open-ended "any reason or
    // no reason" discretion behind that reward is an implied sentiment
    // condition (16 CFR Part 465), whatever the code does or does not read.
    // The enumerated list and the never-for-being-negative promise are what
    // close it, and both must survive any copy edit.
    expect(terms).toContain("We do not");
    expect(terms).toMatch(/reject a review for being\s+critical or negative/);
    expect(terms).toMatch(/rejection never depends on your\s+rating/);
    expect(terms).not.toContain("any reason or no reason");
    for (const ground of ["first-hand", "material connection", "slurs", "off-topic or spam"]) {
      expect(terms, `rejection ground missing: ${ground}`).toContain(ground);
    }
    expect(read("../lib/markCopy.ts")).toContain("never depend on your opinion of a spot");
    expect(terms).toContain("The score shown for a spot is computed by us");
    expect(terms).not.toContain("automated calculation from");
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

describe("the displayed rating only says what it can back up (item 43, D24 amended 2026-07-21)", () => {
  // The owner replaced the 5-review threshold with a weighted blend: their
  // rating counts as 5 reviews, each user review as 1. The math and its edge
  // cases are covered in lib/rating.test.ts; these guard the DISPLAY promises
  // that D24 was cleared on, which no unit test of the arithmetic can see.
  const drawer = read("./SpotDrawer.tsx");
  const rating = read("../lib/rating.ts");
  const ratingUI = read("./SpotRating.tsx");

  it("serves raw totals, since a rounded average cannot be blended", () => {
    // Re-adding a threshold or an average here would silently strip the
    // reviews the blend needs, and the UI would show the owner's rating alone
    // while looking exactly as if it had blended.
    expect(aggRoute).toContain("sum: t.sum, count: t.count");
    expect(aggRoute).not.toMatch(/if \(t\.count < \w+\) continue;/);
    expect(aggRoute).not.toMatch(/avg:/);
  });

  it("keeps a threshold where there is no owner prior to damp a lone review", () => {
    // Removing this without an owner rating in play would put a raw "1.0 out
    // of 5" off a single review onto a spot, which is the exact thing D24's
    // safety rationale forbids.
    expect(rating).toMatch(/MIN_REVIEWS_WITHOUT_PRIOR = 5/);
    expect(rating).toMatch(/if \(count >= MIN_REVIEWS_WITHOUT_PRIOR\)/);
  });

  it("computes the display number in exactly one place", () => {
    // Two call sites, one formula. A second inlined average anywhere is how
    // the list and the sheet start disagreeing about the same spot.
    for (const src of [card, drawer]) {
      expect(src).toContain("displayRating(");
      expect(src).toContain("<SpotRating rating={rating} />");
    }
  });

  // The legal gate (2026-07-21) returned needs-changes on the first draft of
  // this display: with the owner's rating weighted as 5, a one-review spot is
  // 5/6 the owner's own opinion, and the draft still labelled it "(1)" and
  // "from 1 paddler review". These four guards are that finding in executable
  // form. They are not style rules.
  it("never credits a blended number to the contributors who did not produce it", () => {
    const blended = ratingUI.slice(ratingUI.indexOf("rating.blended ? ("), ratingUI.indexOf(") : rating.count > 0"));
    expect(blended).toContain("Paddle score");
    expect(blended).toContain("combining our own rating with");
    // The bare parenthesized count is the crowd-average idiom. Not on a blend.
    expect(blended).not.toMatch(/\(\{rating\.count\}\)/);
    expect(blended).not.toMatch(/from \$\{rating\.count\}/);
  });

  it("names the blended number as ours, visibly and not only to a screen reader", () => {
    // A star + number with no label reads as a consumer aggregate. The label
    // has to be in the visible tree, so `aria-hidden` (sighted) text carries it.
    expect(ratingUI).toMatch(/aria-hidden[\s\S]{0,80}Paddle score/);
  });

  it("keeps the plain-average display for spots the owner never rated", () => {
    // Those numbers ARE pure contributor averages, so they keep D24's count.
    const crowdOnly = ratingUI.slice(ratingUI.indexOf(") : rating.count > 0"));
    expect(crowdOnly).toContain("from ${rating.count} paddler");
    expect(crowdOnly).toMatch(/\(\{rating\.count\}\)/);
  });

  it("keeps the blend labelled as ours after the breakdown line was removed", () => {
    // The owner removed the "Our take X · paddlers Y" breakdown and the
    // weighting sentence from the sheet on 2026-07-21, after the legal gate
    // had asked for them. What remains carrying that job: the visible
    // "Paddle score" label on the number, and the individual reviews listed
    // in the sheet. If either of those goes too, a blended number would be
    // presented with nothing marking it as ours.
    expect(drawer).not.toContain("Our take");
    expect(drawer).not.toContain("counts as five reviews");
    expect(ratingUI).toMatch(/aria-hidden[\s\S]{0,80}Paddle score/);
    expect(drawer).toContain("<ReviewsSection");
  });

  it("gives EVERY card the review totals, not just the pinned strips", () => {
    // The main list rendered <SpotCard> with no `crowd` prop from item 43 until
    // 2026-07-21. Nobody saw it, because no spot had cleared the 5-review
    // threshold, so the payload was always empty. The blend made it visible:
    // the list showed the owner's raw rating while the sheet showed the
    // blended score, for the same spot. Count the usages so a fourth card
    // added without the prop fails here rather than in production.
    const list = read("./SpotList.tsx");
    const usages = list.split("<SpotCard").length - 1;
    expect(usages).toBeGreaterThan(0);
    expect(list.split("crowd={aggregates[spot.id]}").length - 1).toBe(usages);
  });

  it("keeps the blended score out of structured data", () => {
    // Google's rating markup is for crowd ratings; an operator-weighted score
    // there is a manual-action and a deception risk at once.
    const sd = read("../lib/structured-data.ts");
    expect(sd).not.toContain("aggregateRating");
    expect(sd).not.toContain("ratingValue");
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
    //
    // Item 83 moved the confirmation strings out of the component and into
    // lib/markCopy.ts. Assert against the copy the component RENDERS, not
    // against the file the copy used to live in, or this guard passes or fails
    // on where a string sits rather than on whether the promise is made.
    expect(section).toContain("confirmation(spot.water");
    expect(markCopy).toContain("goes to a person for review before it appears");
    expect(read("../app/privacy/page.tsx")).toContain("read by a person before it appears");
  });

  it("tells the truth about BOTH paths after item 79", () => {
    // A text-less rating goes live at once; saying it was "sent for review"
    // would be a false statement to the contributor. Assert the two paths say
    // different, accurate things, rather than pinning one exact sentence: the
    // wording is free to change, the distinction is not.
    const live = confirmation("Rollins Lake", true);
    const held = confirmation("Rollins Lake", false);
    expect(live).toMatch(/is live/);
    expect(live).not.toMatch(/review before it appears/);
    expect(held).toContain("goes to a person for review before it appears");
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
