import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const feedbackModalSrc = fs.readFileSync(path.resolve(__dirname, "FeedbackModal.tsx"), "utf-8");
const conditionsPanelSrc = fs.readFileSync(path.resolve(__dirname, "ConditionsPanel.tsx"), "utf-8");
const nextGoodWindowPanelSrc = fs.readFileSync(path.resolve(__dirname, "NextGoodWindowPanel.tsx"), "utf-8");
const spotDrawerSrc = fs.readFileSync(path.resolve(__dirname, "SpotDrawer.tsx"), "utf-8");

describe("Tailwind v4 CSS variable syntax fix (panels)", () => {
  it("FeedbackModal has no invalid bracket var syntax", () => {
    expect(feedbackModalSrc).not.toContain("-[--");
  });

  it("ConditionsPanel has no invalid bracket var syntax", () => {
    expect(conditionsPanelSrc).not.toContain("-[--");
  });

  it("NextGoodWindowPanel has no invalid bracket var syntax", () => {
    expect(nextGoodWindowPanelSrc).not.toContain("-[--");
  });

  it("SpotDrawer has no invalid bracket var syntax", () => {
    expect(spotDrawerSrc).not.toContain("-[--");
  });

  it("FeedbackModal focus ring/border and accent classes use the parens var() form", () => {
    expect(feedbackModalSrc).toContain("text-(--muted)");
    expect(feedbackModalSrc).toContain("border-(--accent)");
  });

  it("legitimate non-var arbitrary values are untouched", () => {
    expect(conditionsPanelSrc).toContain("-[10px]");
    expect(spotDrawerSrc).toContain("-[58vh]");
  });
});
