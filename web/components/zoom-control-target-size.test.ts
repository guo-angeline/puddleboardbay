import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("zoom control target size (defect B, acceptance 3)", () => {
  const globalsCss = fs.readFileSync(
    path.resolve(__dirname, "../app/globals.css"),
    "utf-8"
  );
  const mapView = fs.readFileSync(
    path.resolve(__dirname, "../components/MapView.tsx"),
    "utf-8"
  );

  it("sets a >=44px hit target on .leaflet-control-zoom a", () => {
    const match = globalsCss.match(
      /\.leaflet-control-zoom\s+a\s*\{([^}]*)\}/
    );
    expect(match, ".leaflet-control-zoom a rule not found").not.toBeNull();
    const block = match![1];
    expect(block).toMatch(/width:\s*44px/);
    expect(block).toMatch(/height:\s*44px/);
  });

  it("does not disable the focus ring on the enlarged buttons", () => {
    const match = globalsCss.match(
      /\.leaflet-control-zoom\s+a\s*\{([^}]*)\}/
    );
    const block = match![1];
    expect(block).not.toMatch(/outline\s*:\s*none/);
  });

  it("keeps exactly one L.canvas( renderer in MapView.tsx", () => {
    const occurrences = mapView.match(/L\.canvas\(/g) || [];
    expect(occurrences.length).toBe(1);
  });

  it("keeps all markers passing the shared renderer prop", () => {
    const rendererPropCount = (mapView.match(/renderer=\{renderer\}/g) || [])
      .length;
    expect(rendererPropCount).toBeGreaterThan(0);
  });
});
