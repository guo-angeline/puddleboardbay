import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const mapViewSrc = fs.readFileSync(path.resolve(__dirname, "MapView.tsx"), "utf-8");
const homeClientSrc = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

describe("map legend stacking fix", () => {
  it("MapContainer gets its own stacking context so Leaflet panes can't paint over the legend", () => {
    const match = mapViewSrc.match(/<MapContainer[\s\S]*?className="([^"]*)"/);
    expect(match).not.toBeNull();
    const classNames = (match?.[1] ?? "").split(/\s+/);
    expect(classNames).toContain("isolate");
  });

  it("HomeClient renders the legend anchored bottom-left, below the z-1200 mobile drawer", () => {
    expect(homeClientSrc).toContain('data-testid="map-legend"');
    expect(homeClientSrc).toContain("DIFFICULTY_LEGEND.map");
    expect(homeClientSrc).toContain("Disclaimer");
    expect(homeClientSrc).toContain("bottom-4 left-4 z-10");
  });

  it("the zero-results empty state still wins over the legend (z-[400] > z-10)", () => {
    expect(homeClientSrc).toContain("z-[400]");
  });

  it("pins stay on the single shared canvas renderer", () => {
    expect(mapViewSrc).toContain("renderer={renderer}");
  });
});
