// Regenerate every raster brand asset from the master icon (asset/icon.png).
// The artwork is used as-is: we only crop the white photo backdrop off the
// navy rounded tile and resize. Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "asset/icon.png");

// The navy rounded tile within the master image (from a trim() bounding box).
const TILE = { left: 667, top: 334, width: 1068, height: 1100 };

const emit = (size, out) =>
  sharp(SRC)
    .extract(TILE)
    .resize(size, size, { fit: "fill" })
    .png()
    .toFile(path.join(root, out));

await emit(256, "app/icon.png");        // favicon
await emit(180, "app/apple-icon.png");  // iOS home screen
await emit(192, "public/icon-192.png"); // PWA manifest
await emit(512, "public/icon-512.png"); // PWA manifest
await emit(72, "public/email-logo.png"); // email masthead badge (36px @2x)

// OG badge: same tile with its corners cut to transparent so it sits flush on
// the navy OG canvas (no white corner triangles). The mask over-clips slightly
// into the navy edge — invisible on a matching navy background.
const OG = 400;
const R = 96;
const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${OG}" height="${OG}"><rect x="3" y="3" width="${OG - 6}" height="${OG - 6}" rx="${R}" ry="${R}" fill="#fff"/></svg>`
);
await sharp(SRC)
  .extract(TILE)
  .resize(OG, OG, { fit: "fill" })
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toFile(path.join(root, "public/og-mark.png"));

console.log("brand assets regenerated from asset/icon.png");
