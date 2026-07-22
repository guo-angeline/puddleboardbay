import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Item 83. The marks system is one careless edit away from being a different
 * product: a completion checklist over launch sites, a public status ladder, or
 * a reward for going paddling. These guards are the design decisions in
 * executable form. They are not style rules.
 */
const raw = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
/**
 * Comments in these files EXPLAIN the rules below (they quote "23 of 139" as
 * the thing not to do). Only what renders can mislead a reader, so strip
 * comments first or the guards fail on their own rationale.
 */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const read = (p: string) => stripComments(raw(p));
const log = read("./YourLog.tsx");
const moment = read("./MarkMoment.tsx");
const card = read("./SpotCard.tsx");
const sheet = read("./AccountSheet.tsx");
const form = read("./ReviewForm.tsx");
const section = read("./ReviewsSection.tsx");
const marks = read("../lib/marks.ts");

/** Every component + page, so absence is proven against the tree. */
const sweep = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.resolve(__dirname, dir), { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(rel);
    }
  };
  walk(".");
  walk("../app");
  return out;
};

describe("the log is a logbook, not a completion checklist", () => {
  it("renders no denominator, percentage, or progress element", () => {
    // "23 of 139" turns the map into a list to finish, and the list is places
    // to get in the water. This is the single most important rule here.
    for (const [name, src] of [["YourLog", log], ["MarkMoment", moment]] as const) {
      expect(src, name).not.toMatch(/\bof \$\{|\bof \d+/);
      expect(src, name).not.toMatch(/MARKS\.length/);
      expect(src, name).not.toMatch(/role="progressbar"|<progress/);
      expect(src, name).not.toMatch(/toFixed\(\d\)\s*\+?\s*"%"|%`/);
    }
  });

  it("shows an unearned mark's criterion, never its distance", () => {
    // Threshold proximity ("2 more to go") is the documented Stack Overflow
    // steering effect, aimed here at a safety product.
    expect(log).toContain("m.criterion");
    expect(log).not.toMatch(/THRESHOLDS\.\w+\s*-\s*/);
    expect(log).not.toMatch(/more to go|remaining|left\b/i);
  });

  it("compares the reader to nobody", () => {
    for (const src of [log, moment]) {
      expect(src).not.toMatch(/\b(rank|leaderboard|percentile|average|top \d|more than)\b/i);
    }
  });
});

describe("marks stay private to the person who earned them", () => {
  it("never renders a mark on a public review byline", () => {
    // Site-granted standing beside a contributor's name on public UGC is the
    // co-author reading the legal gate flagged in D30 Q1. v1 does not do it.
    const listStart = section.indexOf("reviews!.map");
    const publicList = section.slice(listStart, section.indexOf("</ul>", listStart));
    expect(publicList).not.toMatch(/mark|MARKS|earned/i);
    expect(read("../app/api/reviews/route.ts")).not.toMatch(/\bmark\b/i);
  });

  it("keeps the log inside the account sheet", () => {
    const surfaces = sweep().filter((f) => /YourLog/.test(read(f)));
    expect(surfaces.sort()).toEqual(["./AccountSheet.tsx", "./YourLog.tsx"]);
  });
});

describe("nothing rewards getting on the water", () => {
  it("derives every mark from reading, writing, or saving", () => {
    // The criteria live in one place; if a launch-shaped one is ever added it
    // has to pass through here.
    expect(marks).not.toMatch(/checkin|check_in|check-in|visited|launched|paddled/i);
  });

  it("puts no per-spot progress marker in the list", () => {
    // The "you reported on this" dot was removed at the owner's request
    // (2026-07-22). Beyond taste, a per-spot marker on a list of launch sites
    // is the seed of a collect-them-all display, which is the one shape this
    // feature must never take. Keep the list free of it.
    expect(card).not.toMatch(/reported/);
    expect(read("./SpotList.tsx")).not.toMatch(/reported|useOwnReports/);
    expect(card).not.toMatch(/✓|✔|&check;/);
  });
});

describe("the whole feature is reversible and disclosed", () => {
  it("gates every new surface on the collectables kill switch", () => {
    for (const [name, src] of [
      ["AccountSheet", sheet],
      ["ReviewForm", form],
      ["ReviewsSection", section],
    ] as const) {
      expect(src, name).toContain('useKillSwitch("collectables")');
    }
  });

  it("shows the incentive disclosure where the incentive acts", () => {
    // In the form, next to the assent box, not buried in the terms.
    expect(form).toContain("{DISCLOSURE}");
    expect(form.indexOf("{DISCLOSURE}")).toBeLessThan(form.indexOf("I have read and agree to the"));
  });
});

describe("these guards actually bite", () => {
  it("fails on the mistakes it is meant to catch", () => {
    const DENOM = /\bof \$\{|\bof \d+/;
    const DISTANCE = /more to go|remaining|left\b/i;
    const TICK = /✓|✔|&check;/;
    const GOING = /checkin|check_in|check-in|visited|launched|paddled/i;
    expect(DENOM.test("`${known} of ${total} spots`")).toBe(true);
    expect(DENOM.test("23 of 139")).toBe(true);
    expect(DISTANCE.test("2 more to go")).toBe(true);
    expect(TICK.test("<span>✓</span>")).toBe(true);
    expect(GOING.test("if (spot.visited) award()")).toBe(true);
  });
});
