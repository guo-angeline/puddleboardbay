import { describe, it, expect } from "vitest";
import { emptyStateCopy } from "./emptyStateCopy";

describe("emptyStateCopy", () => {
  it("search only: names search, not filters", () => {
    const result = emptyStateCopy("kayak", false);
    expect(result.title).toContain('"kayak"');
    expect(result.title.toLowerCase()).not.toContain("filters");
    expect(result.clearLabel).toBe("Clear search");
    expect(result.clearKind).toBe("search");
  });

  it("filters only (no search): names filters", () => {
    const result = emptyStateCopy("", true);
    expect(result.title).toBe("No spots match your filters.");
    expect(result.clearLabel).toBe("Clear filters");
    expect(result.clearKind).toBe("filters");
  });

  it("both search and filters active: names both", () => {
    const result = emptyStateCopy("kayak", true);
    expect(result.title).toContain('"kayak"');
    expect(result.title).toContain("with these filters");
    expect(result.clearLabel).toBe("Clear search and filters");
    expect(result.clearKind).toBe("all");
  });

  it("neither search nor filters active: falls back to the filters copy", () => {
    const result = emptyStateCopy("", false);
    expect(result.title).toBe("No spots match your filters.");
    expect(result.clearLabel).toBe("Clear filters");
    expect(result.clearKind).toBe("filters");
  });

  it("truncates a long query to 40 chars plus an ellipsis", () => {
    const longQuery = "a".repeat(60);
    const result = emptyStateCopy(longQuery, false);
    const truncated = "a".repeat(40) + "…";
    expect(result.title).toContain(`"${truncated}"`);
  });

  it("never returns an em dash in any string", () => {
    const cases = [
      emptyStateCopy("kayak", false),
      emptyStateCopy("", true),
      emptyStateCopy("kayak", true),
      emptyStateCopy("", false),
    ];
    for (const c of cases) {
      expect(c.title).not.toContain("—");
      expect(c.clearLabel).not.toContain("—");
    }
  });

  it("treats whitespace-only search as no search", () => {
    const result = emptyStateCopy("   ", false);
    expect(result.title).toBe("No spots match your filters.");
    expect(result.clearKind).toBe("filters");
  });
});
