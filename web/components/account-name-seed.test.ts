import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const sheet = fs.readFileSync(path.resolve(__dirname, "./AccountSheet.tsx"), "utf-8");

/**
 * Reported 2026-07-22: the account sheet showed the "Not set" placeholder to an
 * account that HAS a display name, while the header button showed that same
 * name correctly.
 *
 * Cause: the sheet calls `useAccount()` itself, and that instance has not
 * resolved the user on the sheet's first render, so `useState(displayName)`
 * captured "" and stuck (a useState initialiser runs once). The header did not
 * show the bug because it only renders after its own hook has a user.
 *
 * The fix seeds the field from `GET /api/account`, which is the authoritative
 * value and is already fetched here for the reviews list.
 */
describe("the display-name field shows the name you actually have", () => {
  it("seeds the input from the server response, not only from the auth hook", () => {
    expect(sheet).toMatch(/if \(!nameEdited\.current\) setName\(j\.displayName \?\? ""\)/);
  });

  it("never clobbers what the user is typing", () => {
    // The seed is one-way: once they touch the field, the server value stops
    // being applied, or an in-flight fetch would erase a half-typed name.
    expect(sheet).toMatch(/nameEdited\.current = true;/);
    expect(sheet).toMatch(/const nameEdited = useRef\(false\)/);
  });

  it("decides 'changed' against the server value, so Save is not falsely enabled", () => {
    expect(sheet).toMatch(/const serverName = summary\?\.displayName \?\? displayName;/);
    expect(sheet).toMatch(/name\.trim\(\) !== serverName/);
  });
});
