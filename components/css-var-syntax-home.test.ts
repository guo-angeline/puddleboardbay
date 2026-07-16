import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Tailwind v4.3.0 compiles the bracket-var shorthand `{prop}-[--token]` to an
// invalid declaration (`property:--token`, no var(), dropped by the browser).
// The parens form `{prop}-(--token)` compiles to `property:var(--token)`.
// These four files still had leftover bracket-var forms after the header
// fix in item 37 (which only covered HomeClient's search controls).

const files = {
  homeClient: fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8"),
  spotList: fs.readFileSync(path.resolve(__dirname, "SpotList.tsx"), "utf-8"),
  spotCard: fs.readFileSync(path.resolve(__dirname, "SpotCard.tsx"), "utf-8"),
  filterBar: fs.readFileSync(path.resolve(__dirname, "FilterBar.tsx"), "utf-8"),
};

describe("css var arbitrary-value syntax (home/list surface)", () => {
  it("HomeClient.tsx has no leftover bracket-var forms", () => {
    expect(files.homeClient).not.toContain("-[--");
  });

  it("SpotList.tsx has no leftover bracket-var forms", () => {
    expect(files.spotList).not.toContain("-[--");
  });

  it("SpotCard.tsx has no leftover bracket-var forms", () => {
    expect(files.spotCard).not.toContain("-[--");
  });

  it("FilterBar.tsx has no leftover bracket-var forms", () => {
    expect(files.filterBar).not.toContain("-[--");
  });

  it("HomeClient.tsx uses the working parens form for muted text and accent border", () => {
    expect(files.homeClient).toContain("text-(--muted)");
    expect(files.homeClient).toContain("border-(--accent)");
  });

  it("legitimate non-var bracket arbitrary values are preserved", () => {
    expect(files.homeClient).toContain("'Newsreader'");
    expect(files.homeClient).toContain("-[400]");
    expect(files.spotList).toContain("text-[11px]");
  });
});
