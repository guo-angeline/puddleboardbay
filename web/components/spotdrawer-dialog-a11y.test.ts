import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Item 70: the full-screen mobile spot sheet must be a real modal dialog
// (role, focus move/trap/restore, inert background), and the desktop side
// panel must NOT be (it is a persistent non-modal region). These are
// source-level guards; the runtime behavior is exercised live at 390px.
const src = fs.readFileSync(path.resolve(__dirname, "SpotDrawer.tsx"), "utf-8");

describe("full-screen mobile spot sheet is an accessible dialog (item 70)", () => {
  it("marks the sheet as a modal dialog labelled by the spot name", () => {
    expect(src).toContain('role: "dialog"');
    expect(src).toContain('"aria-modal": true');
    expect(src).toContain('"aria-labelledby": "spot-sheet-title"');
    expect(src).toContain('id="spot-sheet-title"');
  });

  it("gates the dialog semantics behind the full-screen branch only (desktop stays non-modal)", () => {
    // The role/aria-modal must live inside the `forceFull ? {...} : {}` spread,
    // so the md:static desktop side panel never becomes a dialog.
    expect(src).toMatch(/forceFull\s*\?\s*\{\s*role:\s*"dialog"/);
    // And there must be exactly one role:"dialog" (no unconditional second one).
    expect(src.match(/role: "dialog"/g) ?? []).toHaveLength(1);
  });

  it("moves focus into the sheet on open and restores it on close", () => {
    expect(src).toContain("panel.focus({ preventScroll: true })");
    expect(src).toContain("document.activeElement as HTMLElement");
    expect(src).toContain("opener.focus({ preventScroll: true })");
  });

  it("traps Tab within the sheet", () => {
    expect(src).toContain("FOCUSABLE_SELECTOR");
    expect(src).toContain('e.key !== "Tab"');
    expect(src).toContain("last.focus()");
    expect(src).toContain("first.focus()");
  });

  it("makes the background inert while open and clears it on close", () => {
    expect(src).toContain('setAttribute("inert"');
    expect(src).toContain('removeAttribute("inert")');
    expect(src).toContain("[data-sheet-backdrop]");
  });

  it("only engages when the sheet is full-screen on mobile", () => {
    expect(src).toContain("const forceFull = isMobile && fullScreen;");
    expect(src).toContain("if (!forceFull || !panel) return;");
  });
});
