// One-off: import owner-supplied first-party spot photos.
//
// Owner directive 2026-07-18: these are the owner's OWN photos (not Wikimedia),
// so they carry no attribution overlay (see SpotDrawer figcaption gate) and are
// marked `source: "owner"` in the manifest. Reads full-res images from a source
// dir named by spot id (`<id>.png` / `<id>.jpg` / `<id>.JPG`), writes an 800px
// wide JPEG derivative to public/spot-photos/<id>.jpg (matching the existing
// Wikimedia derivatives), and merges the entries into data/spot-photos.json.
//
// Usage: node raw-data/owner_photos.mjs "/absolute/path/to/source/dir"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "spot-photos");
const MANIFEST = path.join(ROOT, "data", "spot-photos.json");
const DERIV_WIDTH = 800; // match the existing Wikimedia derivatives

const srcDir = process.argv[2];
if (!srcDir || !fs.existsSync(srcDir)) {
  console.error(`source dir not found: ${srcDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(srcDir)
  .filter((f) => /^\d+\.(png|jpe?g)$/i.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));

if (!files.length) {
  console.error("no <id>.png/.jpg files in source dir");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));
fs.mkdirSync(OUT_DIR, { recursive: true });

let added = 0;
for (const f of files) {
  const id = String(parseInt(f));
  const dest = path.join(OUT_DIR, `${id}.jpg`);
  const meta = await sharp(path.join(srcDir, f))
    .rotate() // honor EXIF orientation before stripping metadata
    .resize({ width: DERIV_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest);
  manifest.photos[id] = {
    file: `/spot-photos/${id}.jpg`,
    source: "owner",
  };
  added++;
  console.log(`  ${id}.jpg  ${meta.width}x${meta.height}  ${(meta.size / 1024).toFixed(0)}KB`);
}

manifest.total_with_photo = Object.keys(manifest.photos).length;
manifest.generated = manifest.generated || "";
manifest.curation =
  (manifest.curation || "") +
  ` | 2026-07-18 owner first-party import: +${added} owner-supplied photos (source:"owner", no attribution overlay).`;

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nAdded ${added} owner photos. total_with_photo=${manifest.total_with_photo}`);
