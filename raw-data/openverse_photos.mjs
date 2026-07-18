#!/usr/bin/env node
// Item 56 slice C: widen the free photo search to a THIRD source, Openverse
// (aggregates CC images across Flickr, museums, Wikimedia; free, no API key).
// For the spots that Commons geosearch and Wikidata P18 both missed (mostly
// marinas/sloughs/small launches), text-search Openverse by name and stage the
// top permissive-licensed results for vision review. Openverse text search is
// keyword-relevance, not geo, so vision curation is mandatory (memory
// photo-autopick-needs-vision).
//
// Usage:  node raw-data/openverse_photos.mjs <staging-dir>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STAGE = process.argv[2];
if (!STAGE) { process.stderr.write("usage: openverse_photos.mjs <staging-dir>\n"); process.exit(1); }
fs.mkdirSync(STAGE, { recursive: true });

const UA = "PaddleToWater-photo-harvest/1.0 (https://paddletowater.com; studio loop, item 56)";
const API = "https://api.openverse.org/v1/images/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const spotsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "spots.json"), "utf8"));
const spots = (Array.isArray(spotsRaw) ? spotsRaw : spotsRaw.spots).filter((s) => !s.hidden && s.lat != null);
const shipped = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, "data", "spot-photos.json"), "utf8")).photos).map(Number));
const uncovered = spots.filter((s) => !shipped.has(s.id));

async function jget(url) {
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status === 503) { await sleep(3000 * (a + 1)); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  throw new Error("rate-limited");
}
function licenseLabel(lic, ver) {
  const l = (lic || "").toLowerCase();
  if (l === "cc0") return "CC0";
  if (l === "pdm") return "Public domain";
  return "CC " + l.toUpperCase().replace("-", "-") + (ver ? " " + ver : "");
}

async function download(url, dest) {
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429) { await sleep(2500 * (a + 1)); continue; }
    if (!res.ok) throw new Error(`img HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) throw new Error("too small");
    fs.writeFileSync(dest, buf);
    return;
  }
  throw new Error("rate-limited");
}

const manifest = {};
let hit = 0;
for (const spot of uncovered) {
  const q = [spot.water, spot.city, "California"].filter(Boolean).join(" ");
  try {
    const data = await jget(`${API}?q=${encodeURIComponent(q)}&license=cc0,pdm,by,by-sa&page_size=3&mature=false`);
    await sleep(1100);
    const r = (data.results || [])[0];
    if (!r || !r.thumbnail) continue;
    const ext = "jpg";
    const file = `${spot.id}.${ext}`;
    try { await download(r.thumbnail, path.join(STAGE, file)); }
    catch (e) { process.stderr.write(`spot ${spot.id} dl: ${e.message}\n`); continue; }
    manifest[spot.id] = {
      file, name: spot.water,
      author: r.creator || "Unknown",
      license: licenseLabel(r.license, r.license_version),
      license_url: r.license_url || null,
      source: r.source || "Openverse",
      source_page: r.foreign_landing_url || r.url,
      title: r.title || "",
    };
    hit++;
    process.stdout.write(`spot ${String(spot.id).padStart(3)} ${(spot.water||"").slice(0,26).padEnd(26)} <- ${manifest[spot.id].license} | ${(r.title||"").slice(0,34)}\n`);
    await sleep(400);
  } catch (e) { process.stderr.write(`spot ${spot.id}: ${e.message}\n`); }
}
fs.writeFileSync(path.join(STAGE, "openverse-manifest.json"), JSON.stringify(manifest, null, 2));
process.stdout.write(`\nOpenverse top-1 candidates: ${hit} of ${uncovered.length} uncovered spots -> ${STAGE}\n`);
