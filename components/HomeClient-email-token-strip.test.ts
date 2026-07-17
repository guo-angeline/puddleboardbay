import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "HomeClient.tsx"), "utf-8");

describe("HomeClient strips the email subscription token regardless of spot resolution (item 47 legal gate follow-up)", () => {
  it("runs the t-param strip before the `if (found)` guard, not nested inside it", () => {
    // lib/spots.ts filters `hidden` spots out of ALL_SPOTS, so a spot hidden
    // after an alert/email send resolves `found` to undefined. The strip must
    // not depend on `found` or a hidden-spot arrival leaks a live subscription
    // token into $current_url (PostHogProvider) and browser history forever.
    const foundGuardIdx = src.indexOf("if (found) {");
    const deleteTIdx = src.indexOf('params.delete("t")');
    const replaceStateIdx = src.indexOf("window.history.replaceState");

    expect(foundGuardIdx).toBeGreaterThan(-1);
    expect(deleteTIdx).toBeGreaterThan(-1);
    expect(replaceStateIdx).toBeGreaterThan(-1);

    expect(deleteTIdx).toBeLessThan(foundGuardIdx);
    expect(replaceStateIdx).toBeLessThan(foundGuardIdx);
  });

  it("guards the strip on from === \"email\" and a present token, outside the found check", () => {
    const foundGuardIdx = src.indexOf("if (found) {");
    const emailBranchIdx = src.indexOf('if (from === "email")');
    const deleteTIdx = src.indexOf('params.delete("t")');

    expect(emailBranchIdx).toBeGreaterThan(-1);
    expect(emailBranchIdx).toBeLessThan(foundGuardIdx);
    expect(emailBranchIdx).toBeLessThan(deleteTIdx);
  });

  it("calls reportEmailOpen with an optional spot id so an unresolved (hidden) spot still pings and strips", () => {
    expect(src).toMatch(/reportEmailOpen\(token,\s*found\?\.id\)/);
  });
});
