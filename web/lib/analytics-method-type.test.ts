import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const eventsSrc = fs.readFileSync(path.resolve(__dirname, "analytics-events.ts"), "utf-8");
const drawerSrc = fs.readFileSync(path.resolve(__dirname, "../components/SpotDrawer.tsx"), "utf-8");
const changelog = fs.readFileSync(
  path.resolve(__dirname, "../../analytics/INSTRUMENTATION_CHANGELOG.md"),
  "utf-8",
);

describe("spot_sheet_dismissed method is a compile-enforced union (item 71)", () => {
  it("declares an EventPropMap entry for spot_sheet_dismissed with all six method literals", () => {
    const match = eventsSrc.match(/spot_sheet_dismissed:\s*\{[\s\S]*?\n\s*\};/);
    expect(match).not.toBeNull();
    const entry = match![0];
    expect(entry).toContain("spot_id: number");
    expect(entry).toContain("spot_name: string");
    expect(entry).toContain("region: string");
    for (const literal of ["edge_swipe", "os_back", "back", "close", "backdrop", "drag"]) {
      expect(entry).toContain(`"${literal}"`);
    }
  });

  it("keeps SpotDrawer's dismiss() method values a subset of the typed union", () => {
    // Every quoted string passed as the `method` prop to spot_sheet_dismissed
    // must be one of the six allowed literals; nothing else should sneak in.
    const methodCalls = [...drawerSrc.matchAll(/method:\s*"([a-z_]+)"/g)].map((m) => m[1]);
    expect(methodCalls.length).toBeGreaterThan(0);
    const allowed = new Set(["edge_swipe", "os_back", "back", "close", "backdrop", "drag"]);
    for (const value of methodCalls) {
      expect(allowed.has(value)).toBe(true);
    }
    // The existing emit sites (close, backdrop, back via dismiss(); drag via
    // onHandleEnd) must still be present, unchanged.
    expect(drawerSrc).toContain('dismiss("backdrop")');
    expect(drawerSrc).toContain('dismiss("back")');
    expect(drawerSrc).toContain('method: "drag"');
  });

  it("records the item-71 changelog entry covering both new method values", () => {
    expect(changelog).toContain("spot_sheet_dismissed");
    expect(changelog).toContain("os_back");
    expect(changelog).toContain("edge_swipe");
    expect(changelog).toContain("props-values-changed");
  });
});
