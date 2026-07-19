import { describe, expect, it } from "vitest";

import { parseDeepLink } from "./deepLink";

describe("parseDeepLink", () => {
  it("parses the custom-scheme spot path", () => {
    expect(parseDeepLink("paddletowater://spot/32")).toEqual({
      spotId: 32,
      from: "deeplink",
      token: null,
      windowLabel: null,
    });
  });

  it("parses the push payload's site-relative alert URL (composeAlert shape)", () => {
    const r = parseDeepLink("/?spot=32&from=alert&window=Sat%207%20to%2010am&t=abc123");
    expect(r).toEqual({
      spotId: 32,
      from: "alert",
      token: "abc123",
      windowLabel: "Sat 7 to 10am",
    });
  });

  it("parses a reminder tap (from=alert, no window)", () => {
    const r = parseDeepLink("/?spot=7&from=alert&t=tok");
    expect(r).toEqual({ spotId: 7, from: "alert", token: "tok", windowLabel: null });
  });

  it("parses https spot-page links with query", () => {
    expect(parseDeepLink("https://paddletowater.com/spot/104?from=share")).toEqual({
      spotId: 104,
      from: "share",
      token: null,
      windowLabel: null,
    });
  });

  it("parses https root links with ?spot=", () => {
    expect(parseDeepLink("https://paddletowater.com/?spot=9&from=email&t=e1")).toEqual({
      spotId: 9,
      from: "email",
      token: "e1",
      windowLabel: null,
    });
  });

  it("parses custom-scheme query form", () => {
    const r = parseDeepLink("paddletowater:///?spot=15&from=alert&t=x");
    expect(r?.spotId).toBe(15);
    expect(r?.from).toBe("alert");
  });

  it("returns null for URLs with no spot and no from", () => {
    expect(parseDeepLink("paddletowater://")).toBeNull();
    expect(parseDeepLink("https://paddletowater.com/privacy")).toBeNull();
    expect(parseDeepLink("")).toBeNull();
  });

  it("ignores a non-numeric spot", () => {
    expect(parseDeepLink("/?spot=abc&from=alert")?.spotId ?? null).toBeNull();
  });

  it("treats an unknown from value as deeplink", () => {
    expect(parseDeepLink("/?spot=3&from=weird")?.from).toBe("deeplink");
  });

  it("decodes + as space in the window label", () => {
    expect(parseDeepLink("/?spot=3&from=alert&window=Sat+7+to+10am")?.windowLabel).toBe(
      "Sat 7 to 10am"
    );
  });
});
