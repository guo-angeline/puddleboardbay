#!/usr/bin/env node
// Runtime regression check for the map legend (PRD user story 3).
// Plain node + playwright, no test runner. Usage: node scripts/verify-legend.mjs [url]
//
// For desktop (1280x800) and mobile (390x844) viewports, confirms:
//   1. The legend ([data-testid="map-legend"]) is present and visible.
//   2. Its labels/link text match DIFFICULTY_LEGEND (Flatwater, Ocean, River, Disclaimer).
//   3. The legend is not occluded: document.elementFromPoint over its center resolves
//      to the legend itself, not a Leaflet pane stacked above it.
//   4. Exactly one Leaflet overlay-pane canvas exists (shared-renderer invariant).

import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:3000";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

const EXPECTED_LABELS = ["Flatwater", "Ocean", "River"];

const results = [];

function record(check, ok, detail) {
  results.push({ check, ok, detail });
}

async function checkViewport(browser, viewport) {
  const prefix = `[${viewport.name}]`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "load" });

    const legend = page.locator('[data-testid="map-legend"]');
    try {
      await legend.waitFor({ state: "visible", timeout: 15000 });
      record(`${prefix} legend visible`, true);
    } catch (err) {
      record(`${prefix} legend visible`, false, err.message);
      await context.close();
      return;
    }

    const legendText = (await legend.innerText()).trim();
    const missingLabels = EXPECTED_LABELS.filter((label) => !legendText.includes(label));
    if (missingLabels.length === 0) {
      record(`${prefix} legend labels (Flatwater, Ocean, River)`, true);
    } else {
      record(`${prefix} legend labels (Flatwater, Ocean, River)`, false, `missing: ${missingLabels.join(", ")}`);
    }

    const disclaimerLink = legend.locator('a:has-text("Disclaimer")');
    const disclaimerVisible = await disclaimerLink.isVisible().catch(() => false);
    record(`${prefix} Disclaimer link visible`, disclaimerVisible);

    // Wait for the map to actually render before checking occlusion: MapView
    // loads via dynamic(ssr:false) after hydration, so if we probe
    // elementFromPoint before the map exists, nothing can occlude the legend
    // yet and a broken build would false-pass. This wait must happen first.
    try {
      await page.waitForSelector(".leaflet-overlay-pane canvas", { timeout: 15000 });
    } catch (err) {
      record(`${prefix} one-canvas contract`, false, `overlay-pane canvas never appeared: ${err.message}`);
      await context.close();
      return;
    }

    const box = await legend.boundingBox();
    if (!box) {
      record(`${prefix} occlusion check (elementFromPoint)`, false, "legend has no bounding box");
    } else {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      // Run against a URL with results (the default 142-spot load). A zero-result
      // filter state raises the empty-state overlay (z-400) over the legend on
      // purpose, which would read here as a false occlusion failure.
      const isUnoccluded = await page.evaluate(
        ({ x, y }) => {
          const el = document.elementFromPoint(x, y);
          return !!(el && el.closest('[data-testid="map-legend"]'));
        },
        { x: centerX, y: centerY }
      );
      record(
        `${prefix} occlusion check (elementFromPoint)`,
        isUnoccluded,
        isUnoccluded ? undefined : "elementFromPoint at legend center did not resolve inside the legend"
      );
    }

    const canvasCount = await page.evaluate(
      () => document.querySelectorAll(".leaflet-overlay-pane canvas").length
    );
    record(
      `${prefix} one-canvas contract`,
      canvasCount === 1,
      canvasCount === 1 ? undefined : `expected 1 overlay-pane canvas, found ${canvasCount}`
    );
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      await checkViewport(browser, viewport);
    }
  } finally {
    await browser.close();
  }

  let allPassed = true;
  for (const { check, ok, detail } of results) {
    const status = ok ? "PASS" : "FAIL";
    if (!ok) allPassed = false;
    const line = detail ? `${status}  ${check}: ${detail}` : `${status}  ${check}`;
    console.log(line);
  }

  if (allPassed) {
    console.log(`\nAll checks passed against ${url}.`);
    process.exit(0);
  } else {
    console.log(`\nOne or more checks failed against ${url}.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("verify-legend.mjs crashed:", err);
  process.exit(1);
});
