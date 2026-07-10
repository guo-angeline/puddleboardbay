import { describe, it, expect } from "vitest";
import {
  composeConfirmEmail,
  composeAlertEmail,
  confirmUrl,
  unsubscribeUrl,
  emailOpenUrl,
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

describe("composeAlertEmail", () => {
  const base = {
    spotName: "Richardson Bay",
    spotId: 7,
    windowLabel: "Saturday morning",
    extraCount: 0,
    token: "tok7",
  };

  it("subjects with the spot and window", () => {
    const msg = composeAlertEmail(base);
    expect(msg.subject).toBe("Richardson Bay looks calm Saturday morning");
  });

  it("links the from=email deep link with the token", () => {
    const msg = composeAlertEmail(base);
    expect(msg.html).toContain("from=email");
    expect(msg.html).toContain("spot=7");
    expect(msg.text).toContain("t=tok7");
  });

  it("adds a plural tail when more spots are good", () => {
    const msg = composeAlertEmail({ ...base, extraCount: 2 });
    expect(msg.subject).toContain("Saturday morning");
    expect(msg.text).toContain("+2 more");
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
