import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// iOS Safari zooms the page in whenever a focused text field computes to under
// 16px, and it NEVER zooms back out: dismissing the keyboard and even
// submitting the form leaves the whole app magnified until the user pinches out
// by hand. The owner's screen recording (2026-07-21) caught this on the review
// textarea, which was text-sm (14px). The fix is 16px at the mobile base size,
// NOT `maximum-scale=1` on the viewport, which would fix the zoom by taking
// pinch-zoom away from everyone (WCAG 1.4.4).
//
// This guard sweeps the tree rather than a list of files someone remembered:
// the next input added anywhere gets checked too.

const ROOT = path.resolve(__dirname, "..");
const SKIP = new Set(["node_modules", ".next", "public", "scripts"]);

function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".") || SKIP.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
    }
  };
  walk(ROOT);
  return out;
}

/**
 * Every <input>/<textarea>/<select> tag in a file, as raw tag text. Runs to the
 * self-closing `/>` (or the closing tag) rather than the first `>`: an inline
 * `onChange={(e) => ...}` contains a bare `>`, and stopping there would cut the
 * tag off before its className and pass everything vacuously.
 */
function fields(src: string): string[] {
  return [...src.matchAll(/<(input|textarea|select)\b[\s\S]*?(?:\/>|<\/\1>)/g)].map((m) => m[0]);
}

// Sizes that are >= 16px, so focusing them does not trigger the zoom.
const SAFE_CLASS = /\btext-(base|lg|xl|2xl|3xl)\b/;
// A smaller size is fine only behind a breakpoint variant (md:text-sm etc.),
// because that never applies on the phone where the bug lives.
const UNSAFE_CLASS = /(?<![a-z0-9:-])text-(xs|sm)\b/;
const NON_TEXT = /type=\{?["']?(checkbox|radio|range|color|file|hidden|submit|button)["']?\}?/;

describe("no text field can trigger the iOS focus-zoom trap", () => {
  const found = sources().flatMap((f) =>
    fields(fs.readFileSync(f, "utf-8")).map((tag) => ({ file: path.relative(ROOT, f), tag }))
  );

  it("finds fields to check at all (a vacuous sweep proves nothing)", () => {
    expect(found.length).toBeGreaterThan(5);
  });

  it("declares a base font size of at least 16px on every text-entry field", () => {
    for (const { file, tag } of found) {
      if (NON_TEXT.test(tag)) continue;
      const where = `${file}: ${tag.slice(0, 120)}`;
      // Inline styles: the number has to be >= 16 outright, since an inline
      // style carries no breakpoint.
      const inline = tag.match(/fontSize:\s*(\d+)/);
      if (inline) {
        expect(Number(inline[1]), where).toBeGreaterThanOrEqual(16);
        continue;
      }
      // Class-based: an unqualified text-xs/text-sm is the bug.
      expect(UNSAFE_CLASS.test(tag), where).toBe(false);
      expect(SAFE_CLASS.test(tag), where).toBe(true);
    }
  });

  it("keeps pinch-zoom available (the fix must not be maximum-scale)", () => {
    const layout = fs.readFileSync(path.join(ROOT, "app/layout.tsx"), "utf-8");
    expect(layout).not.toContain("maximumScale");
    expect(layout).not.toContain("userScalable");
  });
});
