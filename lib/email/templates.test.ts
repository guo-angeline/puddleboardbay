import { describe, it, expect } from "vitest";
import {
  composeConfirmEmail,
  composeAlertEmail,
  confirmUrl,
  unsubscribeUrl,
  emailOpenUrl,
  formatHour,
  formatHourRange,
  weekdayFromKey,
  alertVariantForDay,
  ALERT_VARIANT_COUNT,
  POSTAL_ADDRESS,
} from "./templates";

describe("url helpers", () => {
  it("confirmUrl carries the confirm token", () => {
    expect(confirmUrl("abc123")).toBe("https://paddletowater.com/api/email/confirm?t=abc123");
  });
  it("unsubscribeUrl carries the durable token", () => {
    expect(unsubscribeUrl("tok")).toBe("https://paddletowater.com/api/email/unsubscribe?t=tok");
  });
  it("emailOpenUrl tags from=email and carries the token (distinct from push from=alert)", () => {
    const u = emailOpenUrl(42, "tok");
    expect(u).toContain("spot=42");
    expect(u).toContain("from=email");
    expect(u).toContain("t=tok");
    expect(u).not.toContain("from=alert");
  });
});

describe("composeConfirmEmail", () => {
  const msg = composeConfirmEmail("confirmtok", "unsubtok");
  it("subjects the confirmation", () => {
    expect(msg.subject).toMatch(/confirm/i);
  });
  it("links the confirm url in html and text", () => {
    expect(msg.html).toContain("/api/email/confirm?t=confirmtok");
    expect(msg.text).toContain("/api/email/confirm?t=confirmtok");
  });
  it("carries the CAN-SPAM postal address and an unsubscribe link", () => {
    expect(msg.html).toContain(POSTAL_ADDRESS);
    expect(msg.html).toContain("/api/email/unsubscribe?t=unsubtok");
  });
  it("uses no em dashes (house style)", () => {
    expect(msg.html).not.toContain("—");
    expect(msg.text).not.toContain("—");
  });
});

describe("hour + weekday formatters", () => {
  it("formatHour renders 12-hour am/pm without minutes", () => {
    expect(formatHour(7)).toBe("7am");
    expect(formatHour(12)).toBe("12pm");
    expect(formatHour(13)).toBe("1pm");
    expect(formatHour(0)).toBe("12am");
    expect(formatHour(18)).toBe("6pm");
  });

  it("formatHourRange collapses the meridiem when both ends share it", () => {
    expect(formatHourRange(7, 10)).toBe("7 to 10am");
    expect(formatHourRange(13, 17)).toBe("1 to 5pm");
  });

  it("formatHourRange keeps both meridiems when the window crosses noon", () => {
    expect(formatHourRange(10, 13)).toBe("10am to 1pm");
    expect(formatHourRange(11, 12)).toBe("11am to 12pm");
  });

  it("weekdayFromKey names the weekday of a spot-local date", () => {
    expect(weekdayFromKey("2026-07-11")).toBe("Saturday");
    expect(weekdayFromKey("2026-07-12")).toBe("Sunday");
  });
});

describe("composeAlertEmail", () => {
  const base = {
    spotName: "Richardson Bay",
    spotId: 7,
    windowKey: "2026-07-11", // Saturday
    startHour: 7,
    endHour: 10,
    maxWindMph: 6,
    extras: [],
    token: "tok7",
  };

  it("leads with good-to-paddle, the weekday, and the exact hours (no 'calm')", () => {
    const msg = composeAlertEmail(base);
    expect(msg.subject).toBe("Richardson Bay is good to paddle Saturday");
    expect(msg.html).toContain("is good to paddle Saturday, 7 to 10am");
    expect(msg.html).not.toMatch(/calm/i);
    expect(msg.text).not.toMatch(/calm/i);
  });

  it("states the window length and the peak wind (topping out, not under)", () => {
    const msg = composeAlertEmail(base);
    expect(msg.text).toContain("about a 3-hour window, with wind topping out at 6 mph");
    expect(msg.html).not.toMatch(/under \d+ mph/i);
  });

  it("drops the wind clause when max wind is missing or zero", () => {
    expect(composeAlertEmail({ ...base, maxWindMph: undefined }).text).toContain("about a 3-hour window.");
    expect(composeAlertEmail({ ...base, maxWindMph: 0 }).text).not.toMatch(/mph/);
  });

  it("uses the app-free CTA (email is the no-install channel)", () => {
    const msg = composeAlertEmail(base);
    expect(msg.html).toContain("See the forecast");
    expect(msg.html).not.toMatch(/open in the app/i);
  });

  it("links the from=email deep link with the token", () => {
    const msg = composeAlertEmail(base);
    expect(msg.html).toContain("from=email");
    expect(msg.html).toContain("spot=7");
    expect(msg.text).toContain("t=tok7");
  });

  it("names the extra good spots and counts them in the subject, no '+N more' tease", () => {
    const msg = composeAlertEmail({
      ...base,
      extras: [{ name: "Foster City Lagoons", windowKey: "2026-07-11", startHour: 8, endHour: 11 }],
    });
    expect(msg.subject).toBe("2 spots good to paddle Saturday");
    expect(msg.text).toContain("Also good: Foster City Lagoons, Saturday 8 to 11am.");
    expect(msg.html).not.toMatch(/\+\d+ more/);
  });

  it("drops the shared weekday from the subject when spots are good on different days", () => {
    const msg = composeAlertEmail({
      ...base, // primary is Saturday
      extras: [{ name: "Shoreline Lake", windowKey: "2026-07-12", startHour: 9, endHour: 13 }],
    });
    expect(msg.subject).toBe("2 spots good to paddle soon");
    // body stays day-accurate per spot
    expect(msg.text).toContain("Shoreline Lake, Sunday 9am to 1pm");
  });

  it("caps the named extras at 3 and collapses the rest", () => {
    const extra = (name: string, h: number) => ({ name, windowKey: "2026-07-11", startHour: h, endHour: h + 2 });
    const msg = composeAlertEmail({
      ...base,
      extras: [extra("A", 8), extra("B", 9), extra("C", 10), extra("D", 11), extra("E", 12)],
    });
    expect(msg.text).toContain("and 2 more.");
    expect(msg.text).toContain("A, Saturday");
    expect(msg.text).not.toContain("E, Saturday");
  });

  it("includes put-in notes when present and escapes html", () => {
    const msg = composeAlertEmail({ ...base, notes: "Launch at the <ramp> & dock" });
    expect(msg.html).toContain("&lt;ramp&gt;");
    expect(msg.html).toContain("&amp;");
    expect(msg.text).toContain("Launch at the <ramp> & dock");
  });

  it("carries the postal address, unsubscribe link, and no em dashes", () => {
    const msg = composeAlertEmail(base);
    expect(msg.html).toContain(POSTAL_ADDRESS);
    expect(msg.html).toContain("/api/email/unsubscribe?t=tok7");
    expect(msg.html).not.toContain("—");
    expect(msg.text).not.toContain("—");
  });
});

describe("copy rotation", () => {
  const base = {
    spotName: "Richardson Bay",
    spotId: 7,
    windowKey: "2026-07-11", // Saturday
    startHour: 7,
    endHour: 10,
    maxWindMph: 6,
    extras: [],
    token: "tok7",
  };
  const DAY_MS = 86_400_000;

  it("has exactly 7 variants and variant 0 is the original wording", () => {
    expect(ALERT_VARIANT_COUNT).toBe(7);
    const original = composeAlertEmail(base);
    const explicit = composeAlertEmail({ ...base, variant: 0 });
    expect(explicit.subject).toBe("Richardson Bay is good to paddle Saturday");
    expect(explicit.text).toContain("about a 3-hour window, with wind topping out at 6 mph");
    // omitting variant defaults to the same message apart from the v= URL tag
    expect(original.subject).toBe(explicit.subject);
  });

  it("alertVariantForDay is stable within a day and never repeats on consecutive days", () => {
    const t0 = Date.UTC(2026, 6, 13, 2, 0, 0);
    expect(alertVariantForDay(t0)).toBe(alertVariantForDay(t0 + 20 * 3_600_000));
    for (let d = 0; d < 60; d++) {
      const today = alertVariantForDay(t0 + d * DAY_MS);
      const tomorrow = alertVariantForDay(t0 + (d + 1) * DAY_MS);
      expect(today).toBeGreaterThanOrEqual(0);
      expect(today).toBeLessThan(ALERT_VARIANT_COUNT);
      expect(tomorrow).not.toBe(today);
    }
  });

  it("does not pin a weekday to one wording (the mapping shifts week over week)", () => {
    const t0 = Date.UTC(2026, 6, 13, 2, 0, 0);
    expect(alertVariantForDay(t0 + 7 * DAY_MS)).not.toBe(alertVariantForDay(t0));
  });

  it("every variant carries the facts: spot+weekday+hours in the message, window length, wind when present", () => {
    for (let v = 0; v < ALERT_VARIANT_COUNT; v++) {
      const msg = composeAlertEmail({ ...base, variant: v });
      expect(msg.subject).toContain("Richardson Bay");
      expect(msg.text).toContain("Richardson Bay");
      expect(msg.text).toContain("Saturday");
      expect(msg.text).toContain("7 to 10am");
      expect(msg.text).toContain("3");
      expect(msg.text).toContain("6 mph");
      expect(msg.html).toContain("Saturday");
      expect(msg.html).toContain("7 to 10am");
    }
  });

  it("every variant drops wind cleanly when absent and uses no em dashes or unfilled placeholders", () => {
    for (let v = 0; v < ALERT_VARIANT_COUNT; v++) {
      const noWind = composeAlertEmail({ ...base, maxWindMph: undefined, variant: v });
      for (const s of [noWind.subject, noWind.html, noWind.text]) {
        expect(s).not.toMatch(/mph/);
        expect(s).not.toContain("—");
        expect(s).not.toMatch(/\{\w+\}/);
      }
      const withWind = composeAlertEmail({ ...base, variant: v });
      expect(withWind.subject).not.toMatch(/\{\w+\}/);
      expect(withWind.html).not.toMatch(/\{\w+\}/);
    }
  });

  it("every variant fills the multi-spot subjects with the count", () => {
    const extras = [{ name: "Foster City Lagoons", windowKey: "2026-07-11", startHour: 8, endHour: 11 }];
    const extrasOtherDay = [{ name: "Shoreline Lake", windowKey: "2026-07-12", startHour: 9, endHour: 13 }];
    for (let v = 0; v < ALERT_VARIANT_COUNT; v++) {
      expect(composeAlertEmail({ ...base, extras, variant: v }).subject).toContain("2");
      expect(composeAlertEmail({ ...base, extras: extrasOtherDay, variant: v }).subject).toContain("2");
      // same-day subject may name the weekday; cross-day subject must not claim one
      expect(composeAlertEmail({ ...base, extras: extrasOtherDay, variant: v }).subject).not.toContain("Saturday");
    }
  });

  it("tags the deep link with the variant index so clicks segment by wording", () => {
    const msg = composeAlertEmail({ ...base, variant: 4 });
    expect(msg.html).toContain("&v=4");
    expect(msg.text).toContain("&v=4");
    expect(emailOpenUrl(7, "tok")).not.toContain("&v=");
  });

  it("out-of-range variant indexes wrap instead of crashing", () => {
    expect(composeAlertEmail({ ...base, variant: 7 }).subject).toBe(
      composeAlertEmail({ ...base, variant: 0 }).subject
    );
    expect(() => composeAlertEmail({ ...base, variant: -1 })).not.toThrow();
  });

  it("subjects stay deliverability-safe: under 65 chars with a long spot name, no all-caps words", () => {
    for (let v = 0; v < ALERT_VARIANT_COUNT; v++) {
      const msg = composeAlertEmail({ ...base, spotName: "Redwood City Marina Launch", variant: v });
      expect(msg.subject.length).toBeLessThan(65);
      expect(msg.subject).not.toMatch(/\b[A-Z]{4,}\b/);
    }
  });
});
