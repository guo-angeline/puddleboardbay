import { describe, it, expect } from "vitest";
import { selectAlertSpots, composeAlert, sentKey, type SpotWindow } from "@/lib/alerts/select";

const sw = (spotId: number, spotName: string, windowKey: string, label: string): SpotWindow => ({
  spotId, spotName, windowKey, label,
});

describe("selectAlertSpots", () => {
  const windowBySpot = new Map<number, SpotWindow>([
    [2, sw(2, "Foster City Lagoons", "2026-07-04", "Saturday")],
    [3, sw(3, "Coyote Lake", "2026-07-04", "Saturday")],
  ]);

  it("returns watched spots that have a good window and were not already sent", () => {
    const out = selectAlertSpots([2, 3, 9], windowBySpot, new Set(), false);
    expect(out.map((s) => s.spotId)).toEqual([2, 3]); // 9 has no window
  });

  it("excludes spots already alerted for that window", () => {
    const sent = new Set([sentKey(2, "2026-07-04")]);
    const out = selectAlertSpots([2, 3], windowBySpot, sent, false);
    expect(out.map((s) => s.spotId)).toEqual([3]);
  });

  it("returns nothing when the daily cap is reached", () => {
    expect(selectAlertSpots([2, 3], windowBySpot, new Set(), true)).toEqual([]);
  });
});

describe("composeAlert", () => {
  it("names the spot for a single good window", () => {
    const { body, url } = composeAlert([sw(2, "Foster City Lagoons", "2026-07-04", "Saturday")]);
    expect(body).toBe("Saturday looks calm at Foster City Lagoons.");
    expect(url).toBe("/?spot=2&from=alert&window=Saturday");
  });

  it("URL-encodes a multi-word window label so the interstitial can read it back", () => {
    const { url } = composeAlert([sw(2, "Foster City Lagoons", "2026-07-04", "Thursday morning")]);
    expect(url).toBe("/?spot=2&from=alert&window=Thursday%20morning");
  });

  it("appends the subscription token as `t` when given, for the open-ping join", () => {
    const { url } = composeAlert([sw(2, "Foster City Lagoons", "2026-07-04", "Saturday")], "abc123");
    expect(url).toBe("/?spot=2&from=alert&window=Saturday&t=abc123");
  });

  it("omits the token param when no token is supplied", () => {
    const { url } = composeAlert([sw(2, "Foster City Lagoons", "2026-07-04", "Saturday")]);
    expect(url).not.toContain("&t=");
  });

  it("summarizes extras with a +N more", () => {
    const { body } = composeAlert([
      sw(2, "Foster City Lagoons", "2026-07-04", "Saturday"),
      sw(3, "Coyote Lake", "2026-07-04", "Saturday"),
    ]);
    expect(body).toBe("Saturday looks calm at Foster City Lagoons +1 more.");
  });

  it("throws when given no spots", () => {
    expect(() => composeAlert([])).toThrow();
  });
});

describe("sentKey", () => {
  it("formats the dedup key as spotId:windowKey", () => {
    expect(sentKey(2, "2026-07-04")).toBe("2:2026-07-04");
  });
});
