import { describe, it, expect } from "vitest";
import { validateRemindPayload } from "@/lib/remindValidation";

const now = Date.parse("2026-07-10T02:00:00Z");
const future = new Date(now + 12 * 3600 * 1000).toISOString();
const base = { endpoint: "https://push.example/abc", spotId: 18, windowKey: "2026-07-11", fireAt: future };

describe("validateRemindPayload", () => {
  it("accepts a well-formed request and normalizes fireAt to ISO", () => {
    const r = validateRemindPayload({ ...base, spotName: "Mission Creek" }, now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.spotId).toBe(18);
      expect(r.value.windowKey).toBe("2026-07-11");
      expect(r.value.spotName).toBe("Mission Creek");
      expect(Date.parse(r.value.fireAt)).toBe(Date.parse(future));
    }
  });

  it("rejects a missing endpoint", () => {
    expect(validateRemindPayload({ ...base, endpoint: "" }, now)).toMatchObject({ ok: false });
  });

  it("rejects a bad spotId", () => {
    expect(validateRemindPayload({ ...base, spotId: 0 }, now)).toMatchObject({ ok: false });
    expect(validateRemindPayload({ ...base, spotId: 1.5 }, now)).toMatchObject({ ok: false });
  });

  it("rejects a malformed windowKey", () => {
    expect(validateRemindPayload({ ...base, windowKey: "July 11" }, now)).toMatchObject({ ok: false });
  });

  it("rejects a past fireAt", () => {
    const past = new Date(now - 2 * 3600 * 1000).toISOString();
    expect(validateRemindPayload({ ...base, fireAt: past }, now)).toMatchObject({ ok: false });
  });

  it("rejects a fireAt more than 7 days out", () => {
    const farOut = new Date(now + 8 * 86400 * 1000).toISOString();
    expect(validateRemindPayload({ ...base, fireAt: farOut }, now)).toMatchObject({ ok: false });
  });

  it("rejects non-string fireAt / non-object body", () => {
    expect(validateRemindPayload({ ...base, fireAt: 123 }, now)).toMatchObject({ ok: false });
    expect(validateRemindPayload(null, now)).toMatchObject({ ok: false });
  });
});
