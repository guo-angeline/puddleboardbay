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
  TECHNIQUE_TIPS,
  TECHNIQUE_TIP_COUNT,
  techniqueTipForDay,
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

describe("email redesign shell (item 68): masthead, table layout, dark mode", () => {
  const alert = composeAlertEmail({
    spotName: "Richardson Bay",
    spotId: 7,
    windowKey: "2026-07-11",
    startHour: 7,
    endHour: 10,
    maxWindMph: 6,
    extras: [],
    token: "tok7",
  });
  const confirm = composeConfirmEmail("confirmtok", "unsubtok");

  it("renders a branded masthead: logo image + live-text wordmark (survives images off)", () => {
    for (const msg of [alert, confirm]) {
      expect(msg.html).toContain("email-logo.png");
      // the wordmark is live HTML text, not baked into the image, so images-off still brands
      expect(msg.html).toContain("Paddle to Water</span>");
    }
  });

  it("is table-based (role=presentation), not div-flex, so it renders in Outlook/Gmail", () => {
    for (const msg of [alert, confirm]) {
      expect(msg.html).toContain('role="presentation"');
    }
  });

  it("owns dark mode explicitly instead of leaving it to client auto-invert", () => {
    for (const msg of [alert, confirm]) {
      expect(msg.html).toContain("prefers-color-scheme: dark");
      expect(msg.html).toContain('name="color-scheme"');
    }
  });

  it("labels each email with an eyebrow kicker", () => {
    expect(alert.html).toContain("Paddle alert");
    expect(confirm.html).toContain("One more step");
  });
});

describe("email redesign copy (item 68)", () => {
  it("confirm email merges the fine print into one line and drops the unsubscribe-promise filler", () => {
    const msg = composeConfirmEmail("confirmtok", "unsubtok");
    expect(msg.html).toContain("Didn't sign up? Ignore it: nothing happens.");
    expect(msg.text).toContain("Didn't sign up? Ignore it: nothing happens.");
    // the footer's Unsubscribe link now carries this, so the sentence is cut
    expect(msg.html).not.toContain("Unsubscribe any time in one tap");
    expect(msg.html).not.toContain("Ignore this email and nothing happens");
  });

  it("renders extras as a titled card, not a run-on sentence, in the html", () => {
    const base = {
      spotName: "Richardson Bay",
      spotId: 7,
      windowKey: "2026-07-11",
      startHour: 7,
      endHour: 10,
      maxWindMph: 6,
      token: "tok7",
    };
    const sameDay = composeAlertEmail({
      ...base,
      extras: [{ name: "Foster City Lagoons", windowKey: "2026-07-11", startHour: 8, endHour: 11 }],
    });
    expect(sameDay.html).toContain("Also good today");
    const soon = composeAlertEmail({
      ...base,
      extras: [{ name: "Shoreline Lake", windowKey: "2026-07-12", startHour: 9, endHour: 13 }],
    });
    expect(soon.html).toContain("Also good soon");
    const extra = (name: string, h: number) => ({ name, windowKey: "2026-07-11", startHour: h, endHour: h + 2 });
    const overflow = composeAlertEmail({
      ...base,
      extras: [extra("A", 8), extra("B", 9), extra("C", 10), extra("D", 11), extra("E", 12)],
    });
    expect(overflow.html).toContain("And 2 more.");
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
    expect(msg.subject).toBe("Richardson Bay looks good to paddle Saturday");
    expect(msg.html).toContain("looks good to paddle Saturday, 7 to 10am");
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
    expect(msg.subject).toBe("2 spots look good to paddle Saturday");
    expect(msg.text).toContain("Also good: Foster City Lagoons, Saturday 8 to 11am.");
    expect(msg.html).not.toMatch(/\+\d+ more/);
  });

  it("drops the shared weekday from the subject when spots are good on different days", () => {
    const msg = composeAlertEmail({
      ...base, // primary is Saturday
      extras: [{ name: "Shoreline Lake", windowKey: "2026-07-12", startHour: 9, endHour: 13 }],
    });
    expect(msg.subject).toBe("2 spots look good to paddle soon");
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

  it("includes the launch direction tip in both html and text when the wind qualifies", () => {
    const msg = composeAlertEmail({ ...base, windDirection: "WNW", maxWindMph: 12 });
    expect(msg.html).toContain("Wind is from the west-northwest. An upwind start leaves the downwind leg for the way back.");
    expect(msg.text).toContain("Wind is from the west-northwest. An upwind start leaves the downwind leg for the way back.");
  });

  it("omits the tip cleanly when direction is missing, with no doubled blank line in text", () => {
    const msg = composeAlertEmail({ ...base, windDirection: "", maxWindMph: 12 });
    expect(msg.html).not.toContain("Wind is from the");
    expect(msg.text).not.toContain("Wind is from the");
    expect(msg.text).not.toContain("\n\n\n");
  });

  it("omits the tip cleanly when wind is under 5 mph", () => {
    const msg = composeAlertEmail({ ...base, windDirection: "WNW", maxWindMph: 3 });
    expect(msg.html).not.toContain("Wind is from the");
    expect(msg.text).not.toContain("Wind is from the");
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
    expect(explicit.subject).toBe("Richardson Bay looks good to paddle Saturday");
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

describe("technique tip rotation (item 41)", () => {
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

  it("has a non-empty tip pool, decoupled from the copy-variant count", () => {
    // Started at 7; two unverified tips were cut 2026-07-16 rather than ship
    // unconfirmed technique advice (owner call). The rotation is a modulo over
    // the pool, so the pool size is deliberately NOT pinned to
    // ALERT_VARIANT_COUNT: adding a verified tip must not break this test.
    expect(TECHNIQUE_TIP_COUNT).toBeGreaterThan(0);
    expect(TECHNIQUE_TIPS.length).toBe(TECHNIQUE_TIP_COUNT);
  });

  it("every tip is a real sentence with no em dash and no unfilled placeholder", () => {
    for (const tip of TECHNIQUE_TIPS) {
      expect(tip.length).toBeGreaterThan(20);
      expect(tip).not.toContain("—");
      expect(tip).not.toMatch(/\{\w+\}/);
    }
  });

  it("no tip instructs an action: no launch/go-now/urgency imperatives", () => {
    for (const tip of TECHNIQUE_TIPS) {
      expect(tip).not.toMatch(/\bgo\s+(now|paddle|out)\b/i);
      expect(tip).not.toMatch(/\bhead out\b/i);
      expect(tip).not.toMatch(/\blaunch now\b/i);
      expect(tip).not.toMatch(/\bhurry\b/i);
    }
  });

  it("techniqueTipForDay is stable within a day and rotates day over day", () => {
    const t0 = Date.UTC(2026, 6, 13, 2, 0, 0);
    expect(techniqueTipForDay(t0)).toBe(techniqueTipForDay(t0 + 20 * 3_600_000));
    for (let d = 0; d < 60; d++) {
      const today = techniqueTipForDay(t0 + d * DAY_MS);
      expect(today).toBeGreaterThanOrEqual(0);
      expect(today).toBeLessThan(TECHNIQUE_TIP_COUNT);
    }
  });

  it("composeAlertEmail includes the tip text (html + text) for a given techniqueTipIndex", () => {
    const msg = composeAlertEmail({ ...base, techniqueTipIndex: 3 });
    expect(msg.html).toContain(TECHNIQUE_TIPS[3]);
    expect(msg.text).toContain(TECHNIQUE_TIPS[3]);
  });

  it("defaults to tip 0 when techniqueTipIndex is omitted", () => {
    const msg = composeAlertEmail(base);
    expect(msg.html).toContain(TECHNIQUE_TIPS[0]);
    expect(msg.text).toContain(TECHNIQUE_TIPS[0]);
  });

  it("out-of-range techniqueTipIndex wraps instead of crashing", () => {
    // Pool-size-agnostic on purpose: an index one past the end wraps to the
    // first tip whatever the pool size is. Hardcoding 7 here broke when two
    // unverified tips were cut on 2026-07-16.
    expect(
      composeAlertEmail({ ...base, techniqueTipIndex: TECHNIQUE_TIP_COUNT }).text
    ).toContain(TECHNIQUE_TIPS[0]);
    expect(() => composeAlertEmail({ ...base, techniqueTipIndex: -1 })).not.toThrow();
  });

  it("tags the deep link with pt=<index> so opens can be segmented by tip, only when set explicitly", () => {
    // Use an in-range index: the only producer is techniqueTipForDay, which is
    // always in range, and pt carries the raw index while the rendered tip is
    // the wrapped one. Those agree only in range.
    const idx = TECHNIQUE_TIP_COUNT - 1;
    const msg = composeAlertEmail({ ...base, techniqueTipIndex: idx });
    expect(msg.html).toContain(`&pt=${idx}`);
    expect(msg.text).toContain(`&pt=${idx}`);
    expect(msg.text).toContain(TECHNIQUE_TIPS[idx]);
    expect(emailOpenUrl(7, "tok")).not.toContain("&pt=");
  });
});
