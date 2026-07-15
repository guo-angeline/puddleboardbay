import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const homeClientSrc = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

describe("header search control border token alignment", () => {
  it("desktop inline search no longer hardcodes border-gray-200", () => {
    expect(homeClientSrc).not.toContain("w-52 rounded-lg border border-gray-200");
  });

  it("mobile search toggle no longer hardcodes border-gray-200", () => {
    expect(homeClientSrc).not.toContain("px-2 py-1.5 rounded-lg border border-gray-200");
  });

  it("mobile expanded search no longer hardcodes border-gray-200", () => {
    expect(homeClientSrc).not.toContain("w-full rounded-lg border border-gray-200");
  });

  it("the border token is used at least 3 times for the search controls", () => {
    const matches = homeClientSrc.match(/border-\[--border\]/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("the Feedback button still keeps its accent border", () => {
    expect(homeClientSrc).toContain("border border-[--accent]");
  });

  it("radius and height are preserved on the search input", () => {
    expect(homeClientSrc).toContain("rounded-lg");
    expect(homeClientSrc).toContain("py-1.5");
  });

  it("header section dividers are untouched", () => {
    expect(homeClientSrc).toContain("border-b border-gray-200");
  });
});
