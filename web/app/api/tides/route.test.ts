import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";

const STATION = "9414290";
// Each test uses a distinct date so the route's in-memory cache never bleeds
// across tests (the module-level Map persists for the file's lifetime).
function reqUrl(station: string, begin: string, end: string) {
  return new Request(
    `http://localhost/api/tides?station=${station}&begin_date=${begin}&end_date=${end}`,
  );
}

function noaaOk(predictions: unknown[] = [{ t: "2026-07-17 08:24", v: "5.1", type: "H" }]) {
  return new Response(JSON.stringify({ predictions }), { status: 200 });
}

describe("GET /api/tides", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects a non-numeric station without calling NOAA", async () => {
    const res = await GET(reqUrl("../../etc", "20260101", "20260102"));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a malformed date", async () => {
    const res = await GET(reqUrl(STATION, "2026-01", "20260102"));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes NOAA predictions through on success", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(noaaOk());
    const res = await GET(reqUrl(STATION, "20260201", "20260202"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.predictions).toHaveLength(1);
    expect(body.predictions[0].type).toBe("H");
  });

  it("retries once on a 5xx and succeeds", async () => {
    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockResolvedValueOnce(new Response("upstream", { status: 504 }));
    f.mockResolvedValueOnce(noaaOk());
    const res = await GET(reqUrl(STATION, "20260301", "20260302"));
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("retries once on a thrown network error and succeeds", async () => {
    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockRejectedValueOnce(new Error("aborted"));
    f.mockResolvedValueOnce(noaaOk());
    const res = await GET(reqUrl(STATION, "20260401", "20260402"));
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("returns 502 when both attempts fail", async () => {
    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockResolvedValue(new Response("upstream", { status: 504 }));
    const res = await GET(reqUrl(STATION, "20260501", "20260502"));
    expect(res.status).toBe(502);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("passes a NOAA 200-with-error body through as a non-cached 502", async () => {
    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockResolvedValue(new Response(JSON.stringify({ error: { message: "bad station" } }), { status: 200 }));
    const res1 = await GET(reqUrl(STATION, "20260601", "20260602"));
    expect(res1.status).toBe(502);
    // Not cached: a second identical call fetches again.
    const res2 = await GET(reqUrl(STATION, "20260601", "20260602"));
    expect(res2.status).toBe(502);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("serves a repeated station+day request from cache (one upstream call)", async () => {
    const f = fetch as ReturnType<typeof vi.fn>;
    f.mockResolvedValue(noaaOk());
    await GET(reqUrl(STATION, "20260701", "20260702"));
    await GET(reqUrl(STATION, "20260701", "20260702"));
    expect(f).toHaveBeenCalledTimes(1);
  });
});
