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
    const matches = homeClientSrc.match(/border-\(--border\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("does not use the Tailwind v4 arbitrary-variable bracket shorthand, which compiles to an invalid border-color declaration", () => {
    // border-[--border] compiles to `border-color:--border` (invalid, no var()) on Tailwind 4.3.0.
    // The parens form border-(--border) compiles to `border-color:var(--border)`.
    expect(homeClientSrc).not.toContain("border-[--border]");
  });

  it("the Feedback button keeps its accent border, in the working Tailwind v4 parens form", () => {
    // Parens (--accent) compiles to var(--accent); the bracket form [--accent]
    // compiled to invalid `border-color:--accent` and rendered dark, not azure.
    expect(homeClientSrc).toContain("border border-(--accent)");
    expect(homeClientSrc).not.toContain("border border-[--accent]");
  });

  it("radius and height are preserved on the search input", () => {
    expect(homeClientSrc).toContain("rounded-lg");
    expect(homeClientSrc).toContain("py-1.5");
  });

  it("header section dividers are untouched", () => {
    expect(homeClientSrc).toContain("border-b border-gray-200");
  });
});
