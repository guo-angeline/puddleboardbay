import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
const list = read("./SpotList.tsx");
const drawer = read("./SpotDrawer.tsx");
const section = read("./ReviewsSection.tsx");

/**
 * Item 86. The `reviews` kill switch exists to pull user-generated content in a
 * hurry: a named business objects, or a defamatory or spam review lands.
 *
 * It shipped covering only the spot SHEET. The LIST kept passing published
 * contributor ratings into `displayRating`, so every card still showed a number
 * blended from contributor input, labelled as our take, while the reviews
 * themselves were hidden and the link explaining the blend was gone. Flipping
 * the switch would have looked like it worked and would not have.
 *
 * Both consumers of the aggregate data must gate on the same flag. That is the
 * whole invariant, so it is asserted structurally rather than by counting.
 */
describe("the reviews kill switch reaches every surface that reads contributor data", () => {
  it("gates the aggregate data in BOTH the list and the sheet", () => {
    for (const [name, src] of [["SpotList", list], ["SpotDrawer", drawer]] as const) {
      expect(src, `${name} must read the reviews flag`).toContain('useKillSwitch("reviews")');
    }
    // The sheet's form, verbatim from SpotDrawer.
    expect(drawer).toMatch(/const crowd = spot && reviewsOn \? aggregates\[spot\.id\] : undefined;/);
    // No ungated survivor in the list. The per-card COUNT is owned by
    // reviews-guards.test.ts ("gives EVERY card the review totals"); asserting
    // it in both places would just mean two tests to update in lockstep.
    expect(list).not.toMatch(/crowd=\{aggregates\[spot\.id\]\}/);
  });

  it("still hides the reviews themselves when the switch is off", () => {
    // The half that already worked; asserted so a later edit cannot trade one
    // half of the switch for the other.
    expect(section).toMatch(/if \(!authEnabled \|\| !reviewsOn\) return null;/);
  });

  it("proves the guard bites on the exact bug it was written for", () => {
    // The shipped-and-broken shape: a card receiving aggregates ungated.
    const broken = 'crowd={aggregates[spot.id]}';
    expect(/crowd=\{aggregates\[spot\.id\]\}/.test(broken)).toBe(true);
  });
});

describe("the bare Contributor Terms link is a real touch target (item 87)", () => {
  it("earns its own 24px box, since the sentence that used to cover it is gone", () => {
    // WCAG 2.2 SC 2.5.8 wants 24x24 CSS px. This anchor was covered by the
    // "inline" exception precisely BECAUSE it sat inside a sentence; item 85
    // deleted that sentence and left it alone in its own paragraph at
    // text-xs, roughly a 16px tall target. `inline-block` + `py-1` takes the
    // measured box to exactly 24px.
    const link = section.slice(section.indexOf('href="/contributor-terms"') - 200);
    expect(link).toMatch(/inline-block/);
    expect(link).toMatch(/py-1/);
  });

  it("keeps the three artifacts the item-85 verdict actually depends on", () => {
    // The recorded rationale was narrowed (item 87b): the reader-side line was
    // droppable because the incentive is disclosed AT THE POINT OF WRITING and
    // in the linked terms, NOT because no disclosure is required at all. That
    // narrower position rests on three things existing, so removing any of
    // them needs a fresh gate rather than a copy review.
    const form = read("./ReviewForm.tsx");
    const copy = read("../lib/markCopy.ts");
    const terms = read("../app/contributor-terms/page.tsx");
    expect(form, "writer-side disclosure above the assent box").toContain("{DISCLOSURE}");
    expect(copy, "the disclosure string itself").toContain("never depend on your opinion of a spot");
    expect(terms, "the marks clause in the Contributor Terms").toContain(
      "Marks are for taking part, never for your opinion"
    );
  });
});
