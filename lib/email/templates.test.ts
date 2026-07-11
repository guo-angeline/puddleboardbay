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
