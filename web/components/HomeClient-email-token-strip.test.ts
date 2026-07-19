import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

/**
 * Returns the index of the `}` that closes the `{` at `openBraceIndex`,
 * counting brace depth rather than trusting indentation. Indentation-only
 * checks pass a mutation that re-nests a block one level deeper (the
 * reformatted text still "looks" right at a glance); brace depth does not,
 * because a block nested inside `if (found) { ... }` sits strictly between
 * that block's open and close brace no matter how it is indented.
 */
function findMatchingBrace(str: string, openBraceIndex: number): number {
  let depth = 0;
  for (let i = openBraceIndex; i < str.length; i++) {
    if (str[i] === "{") depth++;
    else if (str[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const foundGuardIdx = src.indexOf("if (found) {");
const foundOpenBrace = src.indexOf("{", foundGuardIdx);
const foundCloseBrace = findMatchingBrace(src, foundOpenBrace);

const idGuardIdx = src.indexOf("if (id) {");
const idOpenBrace = src.indexOf("{", idGuardIdx);
const idCloseBrace = findMatchingBrace(src, idOpenBrace);

const pingGuardIdx = src.indexOf('if (from === "email" && token) {');
const stripGuardIdx = src.indexOf('if ((from === "alert" || from === "email") && token) {');
const deleteTIdx = src.indexOf('params.delete("t")');

describe("HomeClient strips the email subscription token regardless of spot resolution (item 47 legal gate follow-up)", () => {
  it("finds all four anchors this suite depends on", () => {
    // Guards every other assertion below: if any anchor string drifts (a
    // rename, a reformat that changes the literal), fail loudly here instead
    // of the brace-matching assertions silently comparing against -1.
    expect(foundGuardIdx).toBeGreaterThan(-1);
    expect(idGuardIdx).toBeGreaterThan(-1);
    expect(pingGuardIdx).toBeGreaterThan(-1);
    expect(stripGuardIdx).toBeGreaterThan(-1);
    expect(foundCloseBrace).toBeGreaterThan(-1);
    expect(idCloseBrace).toBeGreaterThan(-1);
  });

  it("guards the email open ping on from/token only, not nested inside `if (found)`", () => {
    // lib/spots.ts filters `hidden` spots out of ALL_SPOTS, so a spot hidden
    // after an alert/email send resolves `found` to undefined. The ping (and
    // the strip below) must not be nested inside `if (found) { ... }`, or a
    // hidden-spot arrival leaks a live subscription token into $current_url
    // (PostHogProvider) and browser history forever.
    expect(pingGuardIdx).toBeGreaterThan(foundCloseBrace);
    // ...but it must still be inside `if (id) { ... }`: the ping is keyed off
    // the resolved spot id when one exists, only `found` (not `id`) is the
    // wrong condition to gate on.
    expect(pingGuardIdx).toBeGreaterThan(idOpenBrace);
    expect(pingGuardIdx).toBeLessThan(idCloseBrace);
  });

  it("guards the strip on from being alert or email, outside `if (found)` AND outside `if (id)` entirely", () => {
    // The strip must run even when there is no `spot` id at all on the URL
    // (id falsy), so it sits at the top level of the effect, after the
    // whole `if (id) { ... }` block closes, not nested inside it.
    expect(stripGuardIdx).toBeGreaterThan(idCloseBrace);
    expect(stripGuardIdx).toBeGreaterThan(foundCloseBrace);
    // Ping fires first, strip is issued after, same as an alert-path open.
    expect(pingGuardIdx).toBeLessThan(stripGuardIdx);
    expect(stripGuardIdx).toBeLessThan(deleteTIdx);
  });

  it("calls reportEmailOpen with an optional spot id so an unresolved (hidden) spot still pings and strips", () => {
    expect(src).toMatch(/reportEmailOpen\(token,\s*found\?\.id\)/);
  });

  it("rejects a mutation that re-nests the ping and strip inside `if (found)` (regression pin)", () => {
    // This is the exact defect a naive order-only or indentation-only check
    // missed: re-nesting both blocks inside `if (found)` (preserving
    // ping-before-strip order) reintroduces the hidden-spot token leak while
    // every purely textual/order assertion above it would still pass if it
    // only compared string positions without brace depth.
    const nestedPing = pingGuardIdx > foundOpenBrace && pingGuardIdx < foundCloseBrace;
    const nestedStrip = stripGuardIdx > foundOpenBrace && stripGuardIdx < foundCloseBrace;
    expect(nestedPing).toBe(false);
    expect(nestedStrip).toBe(false);
  });
});
