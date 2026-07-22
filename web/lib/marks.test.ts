import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { deriveLog, newlyEarned, MARKS, THRESHOLDS, type MarkReview } from "./marks";
import { confirmation, earnedLine, DISCLOSURE, LOG_LABELS } from "./markCopy";
import { nextExplored, exploredRegions } from "./exploredSpots";

const pub = (body: string | null = null): MarkReview => ({ status: "published", body });
const pending = (body: string | null = "text"): MarkReview => ({ status: "pending", body });
const regions = (n: number, name = "North Bay") => Array.from({ length: n }, () => name);

describe("marks derive from what a person wrote and read, never from where they went", () => {
  it("awards nothing to an account that has done nothing", () => {
    const log = deriveLog([], [], []);
    expect(log.earned).toEqual([]);
    expect(log).toMatchObject({ reportsLive: 0, spotsKnown: 0, spotsWatched: 0, regionsKnown: 0 });
  });

  it("awards First report for a contribution, without waiting on our queue", () => {
    expect(deriveLog([pub()], [], []).earned).toContain("first-report");
    // Text is held for moderation (D29). Withholding the mark until a human
    // gets to it would punish the contributor for OUR latency, and would mean
    // the bare-star path (instant publish) is the only one that ever gets a
    // moment. Found by submitting a real text review, not by reasoning.
    expect(deriveLog([pending()], [], []).earned).toContain("first-report");
    // The "live" count still means visible to other people, so it stays 0.
    expect(deriveLog([pending()], [], []).reportsLive).toBe(0);
  });

  it("does not count a rejected or removed review", () => {
    expect(deriveLog([{ status: "rejected", body: "x" }], [], []).earned).toEqual([]);
    expect(deriveLog([{ status: "removed", body: "x" }], [], []).earned).toEqual([]);
  });

  it("awards In your own words for text, the moment it is written", () => {
    expect(deriveLog([pub(null)], [], []).earned).not.toContain("own-words");
    expect(deriveLog([pub("  ")], [], []).earned).not.toContain("own-words");
    expect(deriveLog([pub("Shallow at low tide.")], [], []).earned).toContain("own-words");
    // The mark that exists to value sentences over stars must be reachable at
    // the moment someone writes sentences, which is always the pending path.
    expect(deriveLog([pending("Shallow at low tide.")], [], []).earned).toContain("own-words");
  });

  it("awards Local knowledge at three contributions, not two", () => {
    expect(deriveLog([pub(), pub()], [], []).earned).not.toContain("local-knowledge");
    expect(deriveLog([pub(), pub(), pub()], [], []).earned).toContain("local-knowledge");
    expect(deriveLog([pub(), pending(), pub()], [], []).earned).toContain("local-knowledge");
    expect(THRESHOLDS.localKnowledge).toBe(3);
  });

  it("awards Scouted at ten spots looked at closely", () => {
    expect(deriveLog([], regions(9), []).earned).not.toContain("scouted");
    expect(deriveLog([], regions(10), []).earned).toContain("scouted");
  });

  it("awards Around the bay at five DISTINCT regions", () => {
    // Twenty spots in one region is not breadth.
    expect(deriveLog([], regions(20), []).earned).not.toContain("around-the-bay");
    const five = ["North Bay", "East Bay", "South Bay", "Peninsula", "San Francisco"];
    expect(deriveLog([], five, []).earned).toContain("around-the-bay");
    expect(deriveLog([], five.slice(0, 4), []).earned).not.toContain("around-the-bay");
  });

  it("awards Watching at three saved spots, deduped", () => {
    expect(deriveLog([], [], [1, 1, 1]).earned).not.toContain("watching");
    expect(deriveLog([], [], [1, 2, 3]).earned).toContain("watching");
  });

  it("counts saves the account knows about but this device does not", () => {
    // Signing in on a fresh phone must never look like losing a mark.
    expect(deriveLog([], [], [], 3).earned).toContain("watching");
    expect(deriveLog([], [], [7], 3).spotsWatched).toBe(3);
    expect(deriveLog([], [], [7, 8, 9, 10], 2).spotsWatched).toBe(4);
  });

  it("counts existing contributions retroactively, with no ceremony", () => {
    // The owner's decision: a 6-review account opening the log for the first
    // time simply HAS these marks. Nothing replays, because nothing is stored.
    const six = () => [pub("a"), pub(), pub(), pub(), pub(), pub()];
    const log = deriveLog(six(), [], []);
    expect(log.earned).toEqual(["first-report", "own-words", "local-knowledge"]);
    expect(deriveLog(six(), [], [])).toEqual(log);
  });

  it("celebrates at most one mark per submission", () => {
    const before = deriveLog([], [], []);
    const after = deriveLog([pub("first words")], [], []);
    // Two marks became true at once; the moment names one.
    expect(after.earned).toEqual(["first-report", "own-words"]);
    expect(newlyEarned(before, after)).toBe("own-words");
    expect(newlyEarned(after, after)).toBeNull();
  });
});

describe("the reward cannot depend on what someone said (16 CFR Part 465)", () => {
  it("takes no rating anywhere in the derivation or the copy", () => {
    // Structural, not behavioural: a rating is absent from both signatures, so
    // conditioning a reward on sentiment is unwritable rather than merely
    // unwritten. Both directions are barred, so a "reported a hazard" mark
    // would be exactly as non-compliant as a "five stars" one.
    // Strip comments first: the doc blocks in both files EXPLAIN this rule and
    // must not be what satisfies or trips it. Only code can violate it.
    const stripComments = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    const code = (p: string) =>
      stripComments(fs.readFileSync(path.resolve(__dirname, p), "utf-8"));

    expect(code("./marks.ts")).not.toMatch(/\brating\b/i);
    // markCopy may say "Your rating is live" (D29's auto-publish path names the
    // thing that published); it may never BRANCH on a rating value.
    expect(code("./markCopy.ts")).not.toMatch(/rating\s*[<>=!]|[<>=!]\s*rating|rating\s*\?/i);
    expect(deriveLog.length).toBe(3);

    // Prove the guard bites: a derivation that read a rating would fail it.
    expect(/\brating\b/i.test(stripComments("const ok = r.rating >= 4;"))).toBe(true);
  });

  it("words a 1-star and a 5-star submission identically", () => {
    // The caller cannot pass a rating, so this asserts the only thing left:
    // the same spot and publish state produce the same bytes every time.
    expect(confirmation("Rollins Lake", true)).toBe(confirmation("Rollins Lake", true));
    expect(confirmation("Rollins Lake", false)).toBe(confirmation("Rollins Lake", false));
    expect(confirmation("Rollins Lake", true)).toContain("Rollins Lake");
  });

  it("discloses the incentive in the contributor's own words", () => {
    // Conditions on OPINION, not on content: "In your own words" does depend
    // on what you wrote, so the broader claim would have been false.
    expect(DISCLOSURE).toContain("never depend on your opinion of a spot");
    expect(DISCLOSURE).not.toContain("what you say");
  });
});

describe("nothing in the copy can be read as a reason to get on the water", () => {
  // The alerts were stripped of exactly this kind of nudge on wrongful-death
  // grounds. A collection is worse than a push line if it induces: a push
  // expires, a collection accumulates. See lib/alerts/no-inducement.test.ts.
  const strings = [
    ...MARKS.flatMap((m) => [m.name, m.criterion]),
    ...MARKS.map((m) => earnedLine(m.id).line),
    ...MARKS.map((m) => earnedLine(m.id).title),
    confirmation("Rollins Lake", true),
    confirmation("Rollins Lake", false),
    DISCLOSURE,
    LOG_LABELS.reportsLive(3),
    LOG_LABELS.spotsKnown(3),
    LOG_LABELS.spotsWatched(3),
  ];

  it("never tells the reader to visit, paddle, launch, or go anywhere", () => {
    const GOING = /\b(visit|paddle|launch|go to|get out|head out|been to|check in)\b/i;
    for (const s of strings) expect(s, s).not.toMatch(GOING);
  });

  it("never counts places visited, only things read and written", () => {
    const VISIT_COUNT = /\d+\s+(places?|launches?|trips?|outings?|paddles?)\b/i;
    for (const s of strings) expect(s, s).not.toMatch(VISIT_COUNT);
  });

  it("shows no denominator, percentage, or distance to a threshold", () => {
    // "23 of 139" turns a logbook into a completion checklist, and a completion
    // checklist over launch sites is the Pokemon Go mechanic rebuilt on purpose.
    // "2 more to go" is the Stack Overflow steering effect aimed at the same.
    const DENOM = /\bof \d+|\d+\s*%|\bmore to go\b|\b\d+ (?:left|remaining)\b/i;
    for (const s of strings) expect(s, s).not.toMatch(DENOM);
  });

  it("proves those three guards bite", () => {
    const GOING = /\b(visit|paddle|launch|go to|get out|head out|been to|check in)\b/i;
    const VISIT_COUNT = /\d+\s+(places?|launches?|trips?|outings?|paddles?)\b/i;
    const DENOM = /\bof \d+|\d+\s*%|\bmore to go\b|\b\d+ (?:left|remaining)\b/i;
    expect(GOING.test("Paddle three new spots")).toBe(true);
    expect(VISIT_COUNT.test("You have paddled 3 places")).toBe(true);
    expect(DENOM.test("23 of 139 spots")).toBe(true);
    expect(DENOM.test("2 more to go")).toBe(true);
  });
});

describe("the explored set records looking, and forgets nothing", () => {
  it("is idempotent per spot and keeps the region", () => {
    const a = nextExplored({}, 10, "Sierra Nevada");
    expect(a).toEqual({ 10: "Sierra Nevada" });
    expect(nextExplored(a, 10, "Sierra Nevada")).toBe(a); // same reference, no write
    expect(nextExplored(a, 11, "North Bay")).toEqual({ 10: "Sierra Nevada", 11: "North Bay" });
  });

  it("is uncapped, unlike the recents strip it sits beside", () => {
    let map = {};
    for (let i = 1; i <= 40; i++) map = nextExplored(map, i, "North Bay");
    expect(exploredRegions(map)).toHaveLength(40);
    // recentSpots caps at 12 on purpose; a log that forgets is not a log.
    const recents = fs.readFileSync(path.resolve(__dirname, "./recentSpots.ts"), "utf-8");
    expect(recents).toContain("MAX_STORED = 12");
  });
});
