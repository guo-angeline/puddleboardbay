import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "spot-photos.json"), "utf-8")
) as {
  photos: Record<
    string,
    {
      file: string;
      source?: string;
      author?: string;
      license?: string;
      source_page?: string;
      attribution_required?: boolean;
    }
  >;
};
const drawer = fs.readFileSync(path.join(ROOT, "components", "SpotDrawer.tsx"), "utf-8");
const analytics = fs.readFileSync(path.join(ROOT, "lib", "analytics-events.ts"), "utf-8");

describe("item 31 spot photos", () => {
  it("every manifest photo file exists on disk and lives under /spot-photos/", () => {
    const ids = Object.keys(manifest.photos);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const p = manifest.photos[id];
      expect(p.file, `spot ${id} file path`).toMatch(/^\/spot-photos\/.+\.(jpg|jpeg|png)$/);
      expect(
        fs.existsSync(path.join(ROOT, "public", p.file)),
        `missing file for spot ${id}: ${p.file}`
      ).toBe(true);
    }
  });

  it("every third-party photo carries the attribution fields CC-BY/BY-SA require", () => {
    for (const [id, p] of Object.entries(manifest.photos)) {
      // Owner first-party photos owe no attribution and render no credit line.
      if (p.source === "owner") continue;
      expect(p.author, `spot ${id} author`).toBeTruthy();
      expect(p.license, `spot ${id} license`).toBeTruthy();
      // Multiple free sources now (Commons, Wikidata P18 -> Commons, Openverse/
      // Flickr), so the attribution link just has to be a real https source page.
      expect(p.source_page, `spot ${id} source_page`).toMatch(/^https:\/\/\S+$/);
    }
  });

  it("owner photos carry no attribution (first-party) and no CC license", () => {
    for (const [id, p] of Object.entries(manifest.photos)) {
      if (p.source !== "owner") continue;
      // If any of these ever gets set on an owner photo, the figcaption would
      // render a credit line the owner did not ask for. Keep them absent.
      expect(p.author, `owner spot ${id} must have no author`).toBeFalsy();
      expect(p.license, `owner spot ${id} must have no license`).toBeFalsy();
    }
  });

  it("attribution is only ever waived on CC0 / public-domain photos", () => {
    for (const [id, p] of Object.entries(manifest.photos)) {
      if (p.attribution_required !== false) continue;
      // A CC-BY / CC-BY-SA photo legally requires the credit line. Waiving it
      // here would silently strip attribution the licence demands, so the only
      // licences allowed to opt out are the ones that waive every condition.
      expect(
        p.license,
        `spot ${id} waives attribution but is licensed "${p.license}"`
      ).toMatch(/^(cc0|public domain|pdm)/i);
      // Provenance must still be recorded even though nothing renders.
      expect(p.author, `spot ${id} waives attribution but records no author`).toBeTruthy();
      expect(p.source_page, `spot ${id} source_page`).toMatch(/^https:\/\/\S+$/);
    }
  });

  it("the figcaption gate honours both the author and the waiver", () => {
    // Guard the render path itself: a gate on `photo.author` alone would print
    // a credit line on CC0 photos that deliberately waive it.
    expect(drawer).toContain("photo.author && photo.attribution_required !== false");
  });

  it("only free licenses shipped (no fair-use / non-commercial / no-derivatives)", () => {
    for (const [id, p] of Object.entries(manifest.photos)) {
      if (p.source === "owner") continue; // no license field to screen
      expect(p.license, `spot ${id} license "${p.license}"`).toMatch(/cc0|cc by|public domain|pdm/i);
      expect(p.license).not.toMatch(/\bNC\b|\bND\b|noncommercial|no derivativ|fair use|all rights/i);
    }
  });

  it("no orphan image files: every file on disk is referenced by the manifest", () => {
    const referenced = new Set(Object.values(manifest.photos).map((p) => path.basename(p.file)));
    const onDisk = fs.readdirSync(path.join(ROOT, "public", "spot-photos"));
    for (const f of onDisk) {
      expect(referenced.has(f), `orphan file not in manifest: ${f}`).toBe(true);
    }
  });

  it("SpotDrawer renders the photo with attribution, lazy-load, kill switch, and a dwell-gated event", () => {
    expect(drawer).toContain("getSpotPhoto");
    expect(drawer).toContain('useKillSwitch("spot-photos")');
    expect(drawer).toContain("useGenuineView");
    expect(drawer).toContain("spot_photo_viewed");
    expect(drawer).toContain('loading="lazy"');
    expect(drawer).toContain("photo.author");
    expect(drawer).toContain("photo.license");
    expect(drawer).toContain("photo.source_page");
  });

  it("spot_photo_viewed is a declared INTENT event with typed props", () => {
    expect(analytics).toContain('"spot_photo_viewed"');
    expect(analytics).toMatch(/spot_photo_viewed:\s*\{[^}]*spot_id[^}]*region[^}]*license/);
  });
});
