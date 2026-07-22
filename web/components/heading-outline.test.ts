import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raw = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf-8");
/**
 * Comments here EXPLAIN the rule and necessarily write "<h1", so counting the
 * raw source counts the rationale. Only rendered markup can affect the outline.
 */
const read = (p: string) =>
  raw(p).replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const home = read("./HomeClient.tsx");
const spotPage = read("../app/spot/[id]/page.tsx");
const drawer = read("./SpotDrawer.tsx");

/**
 * Item 81: `/` and every `/spot/[id]` served ZERO `<h1>` elements, across 139
 * spot pages that are the entire organic growth plan.
 *
 * The trap this file exists to keep shut: the obvious fix is to promote the
 * drawer's `spot-sheet-title` from h2 to h1, and it does nothing. The drawer
 * mounts client-side after an effect selects the spot, so it is absent from the
 * HTML a crawler fetches. The h1 has to be SERVER-rendered by the page.
 */
describe("every route serves exactly one h1", () => {
  it("puts the home h1 in HomeClient, gated to the home route", () => {
    expect(home).toMatch(/<h1 className="sr-only">/);
    // Gated, or /spot/[id] would serve two h1s (its own plus this one).
    expect(home).toMatch(/initialSpotId === undefined && \(\s*<h1/);
    expect(home.split("<h1").length - 1, "HomeClient must declare exactly one h1").toBe(1);
  });

  it("puts the spot-page h1 in the SERVER component, not the drawer", () => {
    expect(spotPage).toMatch(/<h1 className="sr-only">/);
    expect(spotPage.split("<h1").length - 1).toBe(1);
    // The drawer is client-only, so an h1 there would never reach a crawler.
    // Its title stays an h2 and keeps the id the dialog is labelled by.
    expect(drawer).not.toMatch(/<h1/);
    expect(drawer).toMatch(/<h2 id="spot-sheet-title"/);
  });

  it("keeps the dialog's accessible name resolvable", () => {
    // aria-labelledby must still point at an element that exists.
    expect(drawer).toContain('"aria-labelledby": "spot-sheet-title"');
    expect(drawer).toContain('id="spot-sheet-title"');
  });

  it("orders the spot page h1 before its h2, so the outline does not skip", () => {
    expect(spotPage.indexOf("<h1")).toBeLessThan(spotPage.indexOf("<h2"));
  });

  it("proves the guard bites on the shape that shipped", () => {
    // The broken state: a page component with no h1 at all.
    const broken = '<nav className="sr-only"><h2>More spots</h2></nav>';
    expect(broken.split("<h1").length - 1).toBe(0);
  });
});
