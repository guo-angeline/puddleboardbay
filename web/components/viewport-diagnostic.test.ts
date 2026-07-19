import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const diagnosticSrc = fs.readFileSync(path.resolve(__dirname, "ViewportDiagnostic.tsx"), "utf-8");
const homeClientSrc = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

describe("ViewportDiagnostic component", () => {
  it("is a client component (first non-empty line is \"use client\")", () => {
    const firstLine = diagnosticSrc.split("\n").find((l) => l.trim().length > 0);
    expect(firstLine?.trim()).toBe('"use client";');
  });

  it("contains the exact static heading and footer copy", () => {
    expect(diagnosticSrc).toContain("VIEWPORT DIAGNOSTIC");
    expect(diagnosticSrc).toContain("Debug only, ?vh required.");
  });

  it("contains every row label", () => {
    expect(diagnosticSrc).toContain("display-mode:");
    expect(diagnosticSrc).toContain("screen.height:");
    expect(diagnosticSrc).toContain("window.innerHeight:");
    expect(diagnosticSrc).toContain("visualViewport.height:");
    expect(diagnosticSrc).toContain("safe-area-inset-bottom:");
  });

  it("reads the real viewport APIs and falls back to the literal 'unsupported'", () => {
    expect(diagnosticSrc).toContain("window.screen.height");
    expect(diagnosticSrc).toContain("innerHeight");
    expect(diagnosticSrc).toContain("visualViewport");
    expect(diagnosticSrc).toContain("unsupported");
  });

  it("gates on ?vh via URLSearchParams, not next/navigation useSearchParams", () => {
    expect(diagnosticSrc).toContain("new URLSearchParams(window.location.search)");
    expect(diagnosticSrc).toContain('.has("vh")');
    expect(diagnosticSrc).not.toContain("useSearchParams");
  });

  it("returns null when the param is absent", () => {
    expect(diagnosticSrc).toContain("return null");
  });

  it("renders a fixed, top-most chip with the toast chrome and an accessible label", () => {
    const hasZ9999 = diagnosticSrc.includes("z-[9999]") || diagnosticSrc.includes("9999");
    expect(hasZ9999).toBe(true);
    const hasFixed = diagnosticSrc.includes("position: fixed") || diagnosticSrc.includes("fixed");
    expect(hasFixed).toBe(true);
    expect(diagnosticSrc).toContain("#0B2A47");
    expect(diagnosticSrc).toContain('aria-label="Viewport diagnostic"');
  });

  it("computes the safe-area-inset-bottom via a getComputedStyle probe and detects standalone via matchMedia", () => {
    expect(diagnosticSrc).toContain("getComputedStyle");
    expect(diagnosticSrc).toContain('matchMedia("(display-mode: standalone)")');
  });
});

describe("HomeClient mounts ViewportDiagnostic", () => {
  it("imports the component", () => {
    expect(homeClientSrc).toMatch(/import ViewportDiagnostic from "@\/components\/ViewportDiagnostic"/);
  });

  it("renders it in the tree", () => {
    expect(homeClientSrc).toContain("<ViewportDiagnostic");
  });
});
