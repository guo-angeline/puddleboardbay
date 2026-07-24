import { describe, it, expect } from "vitest";
import { PADDLE_NOW_SEEN_KEY, localDateString } from "@/lib/paddleNow";

describe("localDateString", () => {
  it("formats a Date as local YYYY-MM-DD, zero-padded", () => {
    expect(localDateString(new Date(2026, 6, 1))).toBe("2026-07-01"); // month is 0-indexed
    expect(localDateString(new Date(2026, 11, 25))).toBe("2026-12-25");
  });

  it("uses local calendar fields, not UTC (so the once-per-day gate is per device day)", () => {
    // 2026-07-01 23:30 local is still 2026-07-01, even if UTC has rolled to the 2nd.
    expect(localDateString(new Date(2026, 6, 1, 23, 30))).toBe("2026-07-01");
  });
});

describe("PADDLE_NOW_SEEN_KEY", () => {
  it("is the stable localStorage key the modal and HomeClient agree on", () => {
    expect(PADDLE_NOW_SEEN_KEY).toBe("ptw-paddle-now-seen");
  });
});
