import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALL_SPOTS, ALL_SPOTS_INCLUDING_HIDDEN, HIDDEN_SPOTS } from "@/lib/spots";

const ROOT = path.resolve(__dirname, "..");

describe("hidden spots are withheld everywhere (2026-07-16 coordinate audit)", () => {
  it("filters hidden spots out of ALL_SPOTS but keeps the records", () => {
    // A record count, not a rule. Bumped to 147 by item 90 (the first four Los
    // Angeles spots, 165 by San Diego, 172 by Orange County, 177 statewide). The one that MATTERS is
    // the next line: hidden
    // records are kept and filtered, never deleted.
    expect(ALL_SPOTS_INCLUDING_HIDDEN.length).toBe(177);
    expect(ALL_SPOTS.length).toBe(ALL_SPOTS_INCLUDING_HIDDEN.length - HIDDEN_SPOTS.length);
    expect(ALL_SPOTS.every((s) => !s.hidden)).toBe(true);
  });

  it("hides 79 (Coyote Creek) and 76 (Brisbane): no confirmed public launch exists", () => {
    // 79: reverse-geocodes to a freeway; the one documented paddle from the
    // matching address was a permit-only trip into a closed section of Don
    // Edwards NWR whose own author says paddling there is unsafe and illegal.
    // 76: Brisbane's own marina page lists no ramp; coordinate is byte-identical
    // to an unsourced directory entry that itself asserts no ramp.
    // Un-hiding either needs owner sign-off, not a passing test.
    expect(ALL_SPOTS.some((s) => s.id === 79)).toBe(false);
    expect(ALL_SPOTS.some((s) => s.id === 76)).toBe(false);
  });

  it("every hidden spot documents why", () => {
    for (const s of HIDDEN_SPOTS) {
      expect(s.hidden_reason, `spot ${s.id} is hidden with no reason`).toBeTruthy();
      expect(s.hidden_reason!.length).toBeGreaterThan(40);
    }
  });

  it("no feature file imports data/spots.json directly, bypassing the filter", () => {
    // This is the real guard. A direct import silently skips the hidden check,
    // and the worst place to skip it is the alert crons, which would push or
    // email people toward a spot we deliberately withheld.
    const dirs = ["app", "components", "lib"];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) walk(rel);
        // Skip lib/spots.ts (the one legitimate importer) and test files (this
        // file names the forbidden string in order to search for it).
        else if (
          /\.tsx?$/.test(e.name) &&
          !/\.test\.tsx?$/.test(e.name) &&
          rel !== path.join("lib", "spots.ts")
        ) {
          if (fs.readFileSync(path.join(ROOT, rel), "utf-8").includes('from "@/data/spots.json"')) {
            offenders.push(rel);
          }
        }
      }
    };
    dirs.forEach(walk);
    expect(offenders, `import ALL_SPOTS from "@/lib/spots" instead`).toEqual([]);
  });
});

describe("owner ratings (item 39, 2026-07-16)", () => {
  const rated = ALL_SPOTS_INCLUDING_HIDDEN.filter((s) => typeof s.owner_rating === "number");

  it("carries the owner's 117 hand-entered ratings", () => {
    // Owner hand-entered 119 (D16); each spot hidden since drops its rating per
    // the "no hidden spot carries a rating" invariant below: 92 (D14) -> 118,
    // then 54 (D26, 2026-07-18, misplaced ~30km + covered by spot 150) -> 117.
    expect(rated.length).toBe(117);
  });

  it("delists spot 92, where the user may have no right to launch", () => {
    // Legal gate, 2026-07-16, escalated to D14 and resolved 2026-07-17: the owner
    // delisted 92. It is 101 Surf Sports' private business dock, not a public
    // launch, and the data-quality sweep says a user who drives there may have no
    // right to put in (row 0). Hidden (not deleted) via lib/spots.ts, so it must
    // not appear on any user-facing surface. Un-hide only if replaced with a
    // Water-Trail-confirmed public launch on the San Rafael Canal.
    expect(ALL_SPOTS.find((x) => x.id === 92), "spot 92 must be hidden").toBeUndefined();
    const hidden = ALL_SPOTS_INCLUDING_HIDDEN.find((x) => x.id === 92);
    expect(hidden?.hidden).toBe(true);
    expect(hidden?.hidden_reason).toBeTruthy();
    expect(hidden?.owner_rating).toBeUndefined();
  });

  it("every rating is 1.0-5.0 at one decimal", () => {
    for (const s of rated) {
      const v = s.owner_rating!;
      expect(v, `spot ${s.id}`).toBeGreaterThanOrEqual(1);
      expect(v, `spot ${s.id}`).toBeLessThanOrEqual(5);
      // Guards a JSON round-trip or a bad merge introducing float noise
      // (4.300000000000001), which would render as "4.3" but compare unequal.
      expect(Math.round(v * 10), `spot ${s.id} is not one-decimal`).toBeCloseTo(v * 10, 9);
    }
  });

  it("never rates a hidden spot, so a rating can never reach a surface", () => {
    // Spot 79 is this project's one confirmed fabrication and the owner rated it
    // 3.9 before it was hidden, because the blank sheet was generated over
    // ALL_SPOTS_INCLUDING_HIDDEN. The rating was dropped on the owner's own call.
    // The real guard is structural: no hidden record may carry a rating at all.
    const leaked = HIDDEN_SPOTS.filter((s) => s.owner_rating !== undefined);
    expect(leaked.map((s) => s.id), "a hidden spot carries an owner_rating").toEqual([]);
    expect(ALL_SPOTS_INCLUDING_HIDDEN.find((s) => s.id === 79)?.owner_rating).toBeUndefined();
  });

  it("leaves 24 spots deliberately unrated, and that is not a gap", () => {
    // The sheet told the owner blank was the correct answer where they had not
    // paddled. An unrated spot must render nothing; it must never coerce to 0.
    const unrated = ALL_SPOTS.filter((s) => s.owner_rating === undefined);
    expect(unrated.length).toBe(ALL_SPOTS.length - rated.length);
    expect(unrated.some((s) => s.owner_rating === 0)).toBe(false);
  });

  it("is never rendered as an average or paired with a review count", () => {
    // Population of one. "Average", "reviews", "ratings" (plural) or an out-of-5
    // count next to the number would each assert a consensus that does not exist.
    // Sweep the rendered tree rather than trusting the copy we remember writing.
    const banned = /\b(average rating|avg rating|\d+\s+reviews?|\d+\s+ratings)\b/i;
    // Comments discuss the analysis (which counts ratings) and must not trip the
    // guard; only what renders can mislead a user. Strip them first.
    const stripComments = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
          const src = fs.readFileSync(path.join(ROOT, rel), "utf-8");
          if (src.includes("owner_rating") && banned.test(stripComments(src))) offenders.push(rel);
        }
      }
    };
    ["app", "components", "lib"].forEach(walk);
    expect(offenders, "owner_rating is one paddler, not an aggregate").toEqual([]);

    // Prove the guard still bites after the comment strip, or it certifies nothing.
    expect(banned.test(stripComments('const x = <p>Average rating 4.3</p>;'))).toBe(true);
    expect(banned.test(stripComments('// East Bay: 29 ratings in a 0.4 band'))).toBe(false);
  });
});

describe("tide_sensitive corrections (item 40, 2026-07-17)", () => {
  // Candidate set from the keyword screen: 1, 25, 27, 29, 38, 39, 40, 41, 43,
  // 44, 51, 60, 82, 96. A regex hit is not evidence: it can't tell an
  // assertion from its negation. Each id below was read against its own
  // notes; only records whose notes unambiguously describe tidal dependence
  // (a required tide window, or unusable outside one) were flipped.
  const byId = (id: number) => ALL_SPOTS_INCLUDING_HIDDEN.find((s) => s.id === id)!;

  it("flips ids whose notes unambiguously describe tidal dependence", () => {
    // 1: "Tidal range runs 9-10 feet, so push off about an hour before low."
    // 25: "Stick to mid or high tide or you'll bottom out in the muck..."
    // 29: "paddle upstream past the Bon Air Road bridge at high tide. Tidal,
    //      so check the chart and go with the flow."
    // 39: "Unusable at low tide when mudflats extend into the inlet, so
    //      check tides before arriving."
    // 41: "so plan for a mid-to-high tide to keep water under your board."
    // 44: "otherwise time mid-to-high tide to avoid stranding on mudflats."
    // 51: "Currents at the Gate can hit 6 knots on a strong ebb, so check
    //      the tide tables before heading outside the cove."
    const flipped = [1, 25, 29, 39, 41, 44, 51];
    for (const id of flipped) {
      expect(byId(id).tide_sensitive, `spot ${id} should be flipped to true`).toBe(true);
    }
  });

  it("holds negations false: 60 and 96 explicitly say tides don't matter here", () => {
    // 60: "Usable at all tide levels."
    // 96: "...free of tides and currents."
    expect(byId(60).tide_sensitive).toBe(false);
    expect(byId(96).tide_sensitive).toBe(false);
  });

  it("holds ambiguous mentions false: tidal label alone is not dependence", () => {
    // 27: "moderate tidal current" describes the water body, not a usability
    //     dependency or an action tied to tide state.
    // 38: "opposing tides mid-bay near Hog Island, where chop builds
    //     quickly" is a wind-vs-tide chop hazard on one stretch, not a
    //     tide-gated launch.
    // 40: "A mellow tidal stretch through downtown" labels the water tidal
    //     with no dependency described.
    // 43: "Two put-ins on the same tidal river" labels the water tidal with
    //     no dependency described.
    // 82: "a tidal lagoon in the heart of Oakland" labels the water tidal
    //     with no dependency described.
    const held = [27, 38, 40, 43, 82];
    for (const id of held) {
      expect(byId(id).tide_sensitive, `spot ${id} should stay false`).toBe(false);
    }
  });
});

describe("coordinate corrections (item 40, 2026-07-17)", () => {
  // Candidate set re-verified against primary sources: 54, 63, 64, 65, 70, 84,
  // 120, 134. Only three moved, each on two independent named sources; the
  // rest are report-only (see reports/item-40-record-accuracy-2026-07-17.md,
  // "Phase 2: coordinates"). No single screen moves a pin.
  const byId = (id: number) => ALL_SPOTS_INCLUDING_HIDDEN.find((s) => s.id === id)!;

  it("moves 64 (Del Valle) to the OSM-tagged East Beach boat ramp named in its own notes", () => {
    // Stored coordinate reverse-geocoded to Canyon Trail, a hiking track over
    // 1km from the water. Notes name "the East Beach ramp"; OSM's leisure=
    // slipway node "Del Valle Boat Ramp" plus EBRPD's own park page ("public
    // boat ramp" at the "East Beach marina area") both confirm this point.
    expect(byId(64).lat).toBe(37.5862939);
    expect(byId(64).lng).toBe(-121.7037956);
  });

  it("moves 65 (Jack London Square) to Estuary Park, the launch its own notes name", () => {
    // Notes: "Estuary Park at the Jack London Aquatic Center is the
    // dedicated small-craft launch on this stretch." SF Bay Water Trail's
    // Estuary Park trailhead page publishes 37.79017451,-122.26595967.
    expect(byId(65).lat).toBe(37.7901745);
    expect(byId(65).lng).toBe(-122.2659597);
  });

  it("corrects 134 (Eden Landing)'s corrupted longitude to the Water Trail's published value", () => {
    // Stored lat 37.6221119 already matches the SF Bay Water Trail's own
    // embedded map coordinate (37.6221077, off by ~0.5m); only the longitude
    // was corrupted (-122.1246736, ~193m off). The Water Trail page's
    // Directions link (live-fetched) embeds 37.6221077,-122.1224849 for the
    // Eden Landing Road end. Nominatim reverse geocode on that exact point
    // (live-fetched, independent of the Water Trail fetch) confirms
    // class=amenity, type=parking on Eden Landing Road, matching the
    // record's own notes ("About 30 free parking spaces sit a quarter mile
    // away"), the same disclosed-parking pattern already accepted for the
    // 6-decimal Water Trail block (127/130/132). Latitude is left unchanged.
    expect(byId(134).lat).toBe(37.6221119);
    expect(byId(134).lng).toBe(-122.1224849);
  });

  it("leaves the 6-decimal Water Trail parking block untouched, e.g. spot 127", () => {
    // Proves nothing outside the report churned: 127 is a documented,
    // disclosed parking coordinate (correct as stored) and must not move.
    const s = byId(127);
    expect(s.lat).toBe(38.039643);
    expect(s.lng).toBe(-121.963406);
  });
});
