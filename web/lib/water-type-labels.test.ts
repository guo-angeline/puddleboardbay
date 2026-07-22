import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DIFFICULTY_LABEL, DIFFICULTY_COLOR, DIFFICULTIES } from "./types";
import { searchSpots } from "./search";
import { ALL_SPOTS } from "./spots";

/**
 * Item 78 (owner-directed, 2026-07-22): the water-type labels became plain
 * nouns, Lake / Coast / River, because users reported not knowing what
 * "Flatwater" and "Open water" meant.
 *
 * Nothing was asserting the old labels, so renaming them broke no test. That is
 * the gap this file closes: the labels are a user-facing contract and the enum
 * keys behind them are load-bearing in three separate systems.
 */
describe("water-type labels are plain nouns", () => {
  it("shows Lake / Coast / River", () => {
    expect(DIFFICULTY_LABEL.flatwater).toBe("Lake");
    expect(DIFFICULTY_LABEL.bay).toBe("Coast");
    expect(DIFFICULTY_LABEL.river).toBe("River");
  });

  it("renders none of the old vocabulary anywhere a user can see it", () => {
    // Sweep the tree with comments stripped: the files that EXPLAIN this rename
    // necessarily quote the old words, and a comment cannot confuse anyone.
    const strip = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    const root = path.resolve(__dirname, "..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
          const src = strip(fs.readFileSync(path.join(root, rel), "utf-8"));
          if (/"Flatwater"|"Open water"|>\s*Flatwater\s*<|>\s*Open water\s*</.test(src)) {
            offenders.push(rel);
          }
        }
      }
    };
    ["lib", "components", "app"].forEach(walk);
    expect(offenders, "old water-type labels still rendered").toEqual([]);
  });
});

describe("the enum keys behind the labels never move", () => {
  it("keeps flatwater / bay / river as the stored values", () => {
    // Renaming these would break three things at once: DIFFICULTY_COLOR and so
    // every map pin colour, the filter state, and the `difficulty` analytics
    // prop's comparability with every prior report. The DISPLAY is free to
    // change; the keys are not.
    expect(DIFFICULTIES).toEqual(["flatwater", "bay", "river"]);
    expect(Object.keys(DIFFICULTY_COLOR).sort()).toEqual(["bay", "flatwater", "river", "unknown"]);
    expect(DIFFICULTY_COLOR.flatwater).toBe("#12A5B0");
    expect(DIFFICULTY_COLOR.bay).toBe("#0E6FD1");
    expect(DIFFICULTY_COLOR.river).toBe("#E06636");
    for (const s of ALL_SPOTS) {
      expect(["flatwater", "bay", "river", "unknown"], `spot ${s.id}`).toContain(s.difficulty);
    }
  });
});

describe("search survives the rename in both directions", () => {
  const ids = (q: string) => new Set(searchSpots(ALL_SPOTS, q).map((s) => s.id));

  it("still finds spots by the OLD words someone already learned", () => {
    // A user who learned "flatwater", or followed an old link, must not come up
    // empty. This is the half a rename silently breaks.
    expect(ids("flatwater").size).toBeGreaterThan(0);
    expect(ids("open water").size).toBeGreaterThan(0);
  });

  it("finds them by the new words too", () => {
    expect(ids("lake").size).toBeGreaterThan(0);
    expect(ids("coast").size).toBeGreaterThan(0);
    expect(ids("river").size).toBeGreaterThan(0);
  });
});

describe("Lake Tahoe is classified consistently (the reason this rename was honest)", () => {
  it("puts every Tahoe spot in the same bucket", () => {
    // Before item 78 the four Tahoe spots were split 2/2 between `bay` and
    // `flatwater` with no principled difference, which is the evidence that the
    // field was a water-type taxonomy wearing a difficulty name. Sand Harbor
    // and Waterman's Landing moved to match Kings Beach and Fallen Leaf.
    const tahoe = ALL_SPOTS.filter((s) => /tahoe|sand harbor|waterman|kings beach/i.test(`${s.water} ${s.city ?? ""}`));
    expect(tahoe.length).toBeGreaterThanOrEqual(4);
    expect([...new Set(tahoe.map((s) => s.difficulty))]).toEqual(["flatwater"]);
  });
});
