import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

describe("HomeClient alert interstitial placement", () => {
  it("renders the fixed interstitial outside main content and before feedback", () => {
    const mainContentStart = src.indexOf('<div className="flex-1 flex overflow-hidden min-h-0">');
    const alertBlock = src.indexOf("{selected && alertBanner && alertBanner.spotId === selected.id && (");
    const feedbackModal = src.indexOf("{feedbackOpen && <FeedbackModal");
    const mainContentClose = src.lastIndexOf("\n      </div>\n", feedbackModal);

    expect(mainContentStart).toBeGreaterThan(-1);
    expect(mainContentClose).toBeGreaterThan(mainContentStart);
    expect(alertBlock).toBeGreaterThan(mainContentClose);
    expect(alertBlock).toBeLessThan(feedbackModal);
    expect(src.slice(mainContentStart, mainContentClose)).not.toContain("<AlertInterstitial");
  });
});
