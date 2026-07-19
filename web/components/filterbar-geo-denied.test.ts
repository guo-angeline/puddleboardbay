import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const filterBarSrc = fs.readFileSync(path.resolve(__dirname, "FilterBar.tsx"), "utf-8");
const homeClientSrc = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

describe("Defect A: visible inline geolocation-denied message", () => {
  it("FilterBar references geoErrorReason", () => {
    expect(filterBarSrc).toContain("geoErrorReason");
  });

  it("FilterBar renders an accessible live-region banner, not just a title tooltip", () => {
    expect(filterBarSrc).toContain('role="status"');
    expect(filterBarSrc).toContain('aria-live="polite"');
  });

  it("FilterBar carries reason-specific recovery copy for both denied and unsupported", () => {
    expect(filterBarSrc).toContain("browser or device settings");
    expect(filterBarSrc).toContain("support location");
  });

  it("keeps the existing title attribute on the Near me button as a desktop-hover extra", () => {
    expect(filterBarSrc).toMatch(/title=\{geoError/);
  });

  it("HomeClient sets geoErrorReason to both denied and unsupported outcomes", () => {
    expect(homeClientSrc).toContain('setGeoErrorReason("denied")');
    expect(homeClientSrc).toContain('setGeoErrorReason("unsupported")');
  });

  it("HomeClient passes geoErrorReason down to FilterBar", () => {
    expect(homeClientSrc).toContain("geoErrorReason={geoErrorReason}");
  });
});
