import { describe, it, expect } from "vitest";
import type { Spot } from "@/lib/types";
import { spotFeeText, spotConditionsSummary, spotFacts } from "@/lib/spotSeoContent";
import { spotDescription, llmsTxt } from "@/lib/structured-data";

function spot(over: Partial<Spot> = {}): Spot {
  return {
    id: 1, region: "South Bay", city: "Alviso", water: "Alviso Slough",
    notes: "A tidal slough launch.", lat: 37.4, lng: -121.9,
    difficulty: "flatwater", fee_amount: null, has_fee: null,
    power_boats: null, tide_sensitive: false, dog_friendly: null,
    rentals_available: false, inspection_required: null,
    ...over,
  } as unknown as Spot;
}

describe("spotFeeText (item 136)", () => {
  it("free / paid-with-amount / paid-no-amount / unknown", () => {
    expect(spotFeeText(spot({ has_fee: false }))).toBe("Free to launch");
    expect(spotFeeText(spot({ has_fee: true, fee_amount: 5 }))).toBe("$5 launch fee");
    expect(spotFeeText(spot({ has_fee: true, fee_amount: null }))).toBe("Launch fee");
    expect(spotFeeText(spot({ has_fee: null }))).toBe("Launch fee not confirmed");
  });
});

describe("spotConditionsSummary (item 136)", () => {
  it("names the water type and the tide-sensitivity fact", () => {
    expect(spotConditionsSummary(spot({ tide_sensitive: true }))).toMatch(/Tide-sensitive/);
    expect(spotConditionsSummary(spot({ tide_sensitive: false }))).toMatch(/Not tide-sensitive/);
  });
});

describe("spotFacts (item 136)", () => {
  it("always includes water type, region, fee, conditions; adds known optionals only", () => {
    const facts = spotFacts(spot({ tide_sensitive: true, dog_friendly: true, rentals_available: true, inspection_required: true, power_boats: true }));
    const terms = facts.map((f) => f.term);
    expect(terms).toContain("Water type");
    expect(terms).toContain("Region");
    expect(terms).toContain("Fee");
    expect(terms).toContain("Conditions");
    expect(terms).toContain("Dogs");
    expect(terms).toContain("Rentals");
    expect(terms).toContain("Inspection");
    expect(terms).toContain("Power boats");
  });
  it("omits unknown optionals (nulls)", () => {
    const facts = spotFacts(spot({ dog_friendly: null, power_boats: null, inspection_required: null, rentals_available: false }));
    const terms = facts.map((f) => f.term);
    expect(terms).not.toContain("Dogs");
    expect(terms).not.toContain("Power boats");
    expect(terms).not.toContain("Inspection");
    expect(terms).not.toContain("Rentals");
  });
});

describe("spotDescription no longer truncates at 155 (item 136)", () => {
  it("returns the FULL notes, not a 155-char slice", () => {
    const long = "x".repeat(400);
    expect(spotDescription(spot({ notes: long }))).toBe(long);
    expect(spotDescription(spot({ notes: long }))).not.toContain("…");
  });
});

describe("llmsTxt (item 136)", () => {
  const spots = [
    spot({ id: 1, region: "South Bay", water: "Alviso Slough", city: "Alviso", difficulty: "flatwater", has_fee: false, tide_sensitive: true }),
    spot({ id: 2, region: "Sierra Nevada", water: "Coyote Lake", city: "Gilroy", difficulty: "flatwater", has_fee: true, fee_amount: 3 }),
  ];
  const txt = llmsTxt(spots);
  it("advertises the dataset with the spot count and per-spot links + facts", () => {
    expect(txt).toContain("# Paddle to Water");
    expect(txt).toContain("directory of 2 put-in spots");
    expect(txt).toContain("[Alviso Slough, Alviso](https://paddletowater.com/spot/1)");
    expect(txt).toContain("tide-sensitive");
    expect(txt).toContain("$3 launch fee");
  });
  it("groups by region", () => {
    expect(txt).toContain("## Sierra Nevada");
    expect(txt).toContain("## South Bay");
  });
});
