// One-off: import owner-supplied first-party spot photos.
//
// Owner directive 2026-07-18: these are the owner's OWN photos (not Wikimedia),
// so they carry no attribution overlay (see SpotDrawer figcaption gate) and are
// marked `source: "owner"` in the manifest. Reads full-res images from a source
// dir named by spot id (`<id>.png` / `<id>.jpg` / `<id>.JPG`), writes an 800px
// wide JPEG derivative to public/spot-photos/<id>.jpg (matching the existing
// Wikimedia derivatives), and merges the entries into data/spot-photos.json.
//
// Usage: node raw-data/owner_photos.mjs "/absolute/path/to/source/dir" [id...]
//
// Pass one or more spot ids to import ONLY those. Without ids it imports every
// `<id>.png|jpg` in the dir, which is rarely what you want: the owner's photo
// folder accumulates files across sessions, including ones that were reviewed
// and rejected. On 2026-07-21 the folder still held an `18.jpg` that turned out
// to be saved off a website (spot 18 now ships a CC0 Commons photo instead), so
// an unfiltered run would have re-imported it as first-party and clobbered the
// correct photo. Always pass the ids you actually verified.
//
// NOTE: only mark a photo `source: "owner"` once the owner has confirmed the
// content is theirs. These files are usually screen captures, which carry no
// camera EXIF and cannot establish authorship on their own. See the
// owner-first-party-spot-photos memory.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Repo layout since 2026-07-19: the Next.js app (public/, data/) lives in web/.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "web");
const OUT_DIR = path.join(WEB, "public", "spot-photos");
const MANIFEST = path.join(WEB, "data", "spot-photos.json");
// This script sits at the repo root but its deps (sharp) are installed in web/,
// and ESM resolves from the script's own path, so anchor the require at web/.
const sharp = createRequire(path.join(WEB, "package.json"))("sharp");
const DERIV_WIDTH = 800; // match the existing Wikimedia derivatives

const srcDir = process.argv[2];
if (!srcDir || !fs.existsSync(srcDir)) {
  console.error(`source dir not found: ${srcDir}`);
  process.exit(1);
}

// Optional allowlist of spot ids (everything after the source dir).
const onlyIds = new Set(process.argv.slice(3).map((a) => String(parseInt(a, 10))));

const files = fs
  .readdirSync(srcDir)
  .filter((f) => /^\d+\.(png|jpe?g)$/i.test(f))
  .filter((f) => onlyIds.size === 0 || onlyIds.has(String(parseInt(f))))
  .sort((a, b) => parseInt(a) - parseInt(b));

if (!files.length) {
  console.error("no <id>.png/.jpg files in source dir");
  process.exit(1);
}

if (onlyIds.size === 0) {
  console.warn(
    `WARNING: no ids given, importing ALL ${files.length} matching files as first-party.\n` +
      `         Pass explicit ids to import only what you verified.\n`
  );
} else {
  const missing = [...onlyIds].filter((id) => !files.some((f) => String(parseInt(f)) === id));
  if (missing.length) {
    console.error(`requested ids with no file in source dir: ${missing.join(", ")}`);
    process.exit(1);
  }
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
// Local date, not toISOString(): after ~17:00 Pacific that returns tomorrow's
// UTC date and the curation log ends up stamped a day ahead.
const today = new Date().toLocaleDateString("en-CA");
manifest.curation =
  (manifest.curation || "") +
  ` | ${today} owner first-party import: +${added} owner-supplied photos` +
  ` (spots ${files.map((f) => parseInt(f)).join(", ")}; source:"owner", no attribution overlay).`;

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nAdded ${added} owner photos. total_with_photo=${manifest.total_with_photo}`);
