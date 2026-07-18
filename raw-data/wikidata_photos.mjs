#!/usr/bin/env node
// Item 56 slice B: widen the photo search beyond Commons 500m geosearch, using a
// second FREE source, Wikidata P18 (the "image" property, a curated main photo
// for a place). Most uncovered spots are named lakes/reservoirs/regional parks,
// which have a Wikidata item with a representative image. Matches by NAME then
// VERIFIES with coordinates (P625 within ~4km of the spot) so we don't grab the
// wrong "Silver Lake". The P18 file lives on Commons, so license/author come
// from the same imageinfo call the other slices use. Stages to a dir for vision
// review before anything reaches public/.
//
// Usage:  node raw-data/wikidata_photos.mjs <staging-dir>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STAGE = process.argv[2];
if (!STAGE) { process.stderr.write("usage: wikidata_photos.mjs <staging-dir>\n"); process.exit(1); }
fs.mkdirSync(STAGE, { recursive: true });

const UA = "PaddleToWater-photo-harvest/1.0 (https://paddletowater.com; studio loop, item 56)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const spotsRaw = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "spots.json"), "utf8"));
const spots = (Array.isArray(spotsRaw) ? spotsRaw : spotsRaw.spots).filter((s) => !s.hidden && s.lat != null);
const shipped = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, "data", "spot-photos.json"), "utf8")).photos).map(Number));
const uncovered = spots.filter((s) => !shipped.has(s.id));

async function jget(url) {
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status === 503) { await sleep(1500 * (a + 1)); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  throw new Error("rate-limited");
}
function haversine(la1, lo1, la2, lo2) {
  const R = 6371, d = (x) => (x * Math.PI) / 180;
  const a = Math.sin(d(la2 - la1) / 2) ** 2 + Math.cos(d(la1)) * Math.cos(d(la2)) * Math.sin(d(lo2 - lo1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function wikidataImage(spot) {
  // Search candidate entities by the water/place name.
  const name = spot.water || spot.city;
  if (!name) return null;
  const search = await jget(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&type=item&limit=6&origin=*`);
  const ids = (search.search || []).map((r) => r.id);
  if (!ids.length) return null;
  const ent = await jget(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=claims|labels&languages=en&format=json&origin=*`);
  let best = null;
  for (const id of ids) {
    const e = ent.entities?.[id];
    const claims = e?.claims;
    if (!claims) continue;
    const coord = claims.P625?.[0]?.mainsnak?.datavalue?.value;
    const img = claims.P18?.[0]?.mainsnak?.datavalue?.value; // Commons filename
    if (!coord || !img) continue;
    const dist = haversine(spot.lat, spot.lng, coord.latitude, coord.longitude);
    if (dist > 4) continue; // wrong entity of the same name
    if (!best || dist < best.dist) best = { dist, img, label: e.labels?.en?.value || id, id };
  }
  return best;
}

async function commonsInfo(filename) {
  const title = "File:" + filename;
  const data = await jget(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=1024&format=json&origin=*`);
  const pages = data.query?.pages || {};
  const p = Object.values(pages)[0];
  const ii = p?.imageinfo?.[0];
  if (!ii) return null;
  const em = ii.extmetadata || {};
  const plain = (h) => String(h || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  return { title, thumb: ii.thumburl, mime: ii.mime, license: plain(em.LicenseShortName?.value) || plain(em.License?.value), license_url: em.LicenseUrl?.value || null, author: plain(em.Artist?.value) || "Unknown", source_page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}` };
}
function licenseFree(l) { return /cc0|cc by|public domain|pdm/i.test(l || "") && !/\bnc\b|\bnd\b|noncommercial|no deriv|fair use|all rights/i.test(l || ""); }
function extFromUrl(u) { const m = (u || "").split("?")[0].match(/\.([a-z0-9]{3,4})$/i); const e = (m ? m[1] : "jpg").toLowerCase(); return e === "jpeg" ? "jpg" : e; }

const manifest = {};
let hit = 0;
for (const spot of uncovered) {
  try {
    const wd = await wikidataImage(spot);
    await sleep(250);
    if (!wd) continue;
    const info = await commonsInfo(wd.img);
    await sleep(250);
    if (!info || !info.thumb || !(info.mime || "").startsWith("image/")) continue;
    if (!licenseFree(info.license)) continue;
    const ext = extFromUrl(info.thumb);
    const file = `${spot.id}.${ext}`;
    for (let a = 0; a < 4; a++) {
      const res = await fetch(info.thumb, { headers: { "User-Agent": UA } });
      if (res.status === 429) { await sleep(2000 * (a + 1)); continue; }
      if (!res.ok) throw new Error(`img HTTP ${res.status}`);
      fs.writeFileSync(path.join(STAGE, file), Buffer.from(await res.arrayBuffer()));
      break;
    }
    manifest[spot.id] = { file, name: spot.water, wd_label: wd.label, dist_km: Math.round(wd.dist * 10) / 10, author: info.author, license: info.license, license_url: info.license_url, source: "Wikimedia Commons", source_page: info.source_page, title: info.title };
    hit++;
    process.stdout.write(`spot ${String(spot.id).padStart(3)} ${(spot.water||"").slice(0,28).padEnd(28)} <- ${wd.label} (${manifest[spot.id].dist_km}km) ${info.license}\n`);
    await sleep(200);
  } catch (e) { process.stderr.write(`spot ${spot.id}: ${e.message}\n`); }
}
fs.writeFileSync(path.join(STAGE, "wikidata-manifest.json"), JSON.stringify(manifest, null, 2));
process.stdout.write(`\nWikidata P18 hits: ${hit} of ${uncovered.length} uncovered spots -> ${STAGE}\n`);
