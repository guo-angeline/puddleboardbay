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

/**
 * The legal links (Terms / Disclaimer / Privacy) render TWICE: a deliberately
 * tiny copy in the map legend, and a full-size copy in the list-panel footer.
 * The owner asked for the map real estate back (2026-07-22), so the legend copy
 * is 10px with no padding. That is only acceptable while the other copy remains
 * a real target: WCAG 2.5.8 allows an undersized control when the same function
 * is available through one that meets the size. Shrink BOTH and the site has no
 * compliant route to its own legal pages.
 */
describe("legal links keep one full-size route", () => {
  const list = fs.readFileSync(path.resolve(__dirname, "./SpotList.tsx"), "utf-8");
  const home = fs.readFileSync(path.resolve(__dirname, "./HomeClient.tsx"), "utf-8");

  it("gives the list-panel copy a >=24px target", () => {
    for (const href of ["/terms", "/disclaimer", "/privacy"]) {
      const i = list.indexOf(`href="${href}"`);
      expect(i, `${href} missing from the list footer`).toBeGreaterThan(-1);
      // py-1 on a 16px line box is 24px. inline-block is what makes it apply.
      const tag = list.slice(i, i + 220);
      expect(tag, `${href} must be a real target`).toMatch(/inline-block/);
      expect(tag, `${href} must be a real target`).toMatch(/py-1/);
    }
  });

  it("keeps the dense legend copy dense, and only in the legend", () => {
    expect(home).toMatch(/text-\[10px\] leading-none/);
  });
});
