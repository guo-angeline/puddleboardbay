#!/usr/bin/env node
// Item 56 slice: re-pick the spots that have Commons candidates but no shipped
// photo (the item-31 rejects). Re-scores ALL candidates per un-shipped spot with
// a HARDER junk filter (item 31 learned the misses: species by Latin/common
// name, vehicles, buildings, signs, maps), downloads the top alternate per spot
// to a STAGING dir for vision review before anything reaches public/. Reuses the
// harvest candidate file; adds no new source (that is a later slice).
//
// Usage:  node raw-data/repick_photos.mjs
// Writes: /private/tmp/.../scratchpad/repick-staging/<id>.jpg  and  repick-manifest.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STAGE = process.argv[2];
if (!STAGE) { process.stderr.write("usage: repick_photos.mjs <staging-dir>\n"); process.exit(1); }
fs.mkdirSync(STAGE, { recursive: true });

const candidates = JSON.parse(fs.readFileSync(path.join(__dirname, "photo-candidates.json"), "utf8")).spots;
const shipped = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, "data", "spot-photos.json"), "utf8")).photos).map(Number));
const UA = "PaddleToWater-photo-harvest/1.0 (https://paddletowater.com; studio loop, item 56)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const REL = /\b(launch|boat|ramp|kayak|canoe|paddle|sup|dock|pier|beach|marina|harbou?r|slough|lagoon|estuary|waterfront|shoreline|shore|cove|wharf|lake|reservoir|river|creek|bay|park|water|put[- ]?in|jetty|pond|inlet|channel|delta|bridge|pier|sunset|sunrise|view)\b/gi;
// Harder junk filter than item 31: add generic species/vehicle/structure words.
const JUNK = /\b(map|diagram|chart|logo|icon|plaque|signage|sign|street|road|portrait|selfie|gravestone|headstone|coat of arms|flag of|blazon|scan|document|leaflet|schematic|floor ?plan|bird|duck|goose|geese|heron|egret|gull|tern|plover|sandpiper|sanderling|willet|godwit|curlew|cormorant|pelican|hawk|eagle|falcon|owl|quail|flicker|warbler|sparrow|finch|wren|blackbird|crow|raven|dove|pigeon|flower|blossom|wildflower|mushroom|fungus|lichen|insect|butterfly|moth|dragonfly|spider|beetle|snail|slug|nudibranch|scorpion|lizard|snake|frog|toad|newt|deer|coyote|squirrel|raccoon|seal|otter|dudleya|calidris|uroctonus|car|truck|vehicle|battery|bottle|building|interior|room|store|shop|restaurant|train|locomotive|aerial|satellite|drone)\b/gi;

function tokens(s) {
  return String(s || "").toLowerCase().split(/[^a-z]+/)
    .filter((t) => t.length >= 5 && !["river","creek","marina","beach","state","point","shore","water","reservoir","harbor","harbour","lagoon","slough","island","county"].includes(t));
}
function score(c, spot) {
  const title = c.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "");
  let s = 0;
  s += (title.match(REL) || []).length * 3;
  s -= (title.match(JUNK) || []).length * 8; // harder penalty
  const toks = new Set([...tokens(spot.name), ...tokens(spot.city)]);
  for (const t of toks) if (title.toLowerCase().includes(t)) s += 5;
  s += c.distance_m < 120 ? 3 : c.distance_m < 250 ? 2 : c.distance_m < 400 ? 1 : 0;
  if (c.width && c.height && c.width > c.height) s += 2;
  if (c.width >= 1200) s += 2; else if (c.width >= 800) s += 1;
  return s;
}
function extFromUrl(u) { const m = u.split("?")[0].match(/\.([a-z0-9]{3,4})$/i); const e = (m ? m[1] : "jpg").toLowerCase(); return e === "jpeg" ? "jpg" : e; }

async function download(url, dest) {
  for (let a = 0; a < 5; a++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status === 503) { await sleep(2000 * (a + 1)); continue; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    return;
  }
  throw new Error("rate-limited");
}

const pool = candidates.filter((s) => s.candidate_count > 0 && !shipped.has(s.spot_id));
const manifest = {};
let staged = 0;
for (const spot of pool) {
  const ranked = spot.candidates.map((c) => ({ c, s: score(c, spot) }))
    .sort((a, b) => b.s - a.s || a.c.distance_m - b.c.distance_m);
  const best = ranked[0];
  if (!best || best.s < 4 || !best.c.thumb) continue; // higher bar than item 31 (3)
  const ext = extFromUrl(best.c.thumb);
  const file = `${spot.spot_id}.${ext}`;
  try { await download(best.c.thumb, path.join(STAGE, file)); }
  catch (e) { process.stderr.write(`spot ${spot.spot_id}: ${e.message}\n`); continue; }
  manifest[spot.spot_id] = {
    file, name: spot.name, score: best.s,
    author: best.c.author || "Unknown", license: best.c.license,
    license_url: best.c.license_url || null, source: "Wikimedia Commons",
    source_page: best.c.source_page, title: best.c.title,
  };
  staged++;
  process.stdout.write(`spot ${String(spot.spot_id).padStart(3)} [${String(best.s).padStart(2)}] ${best.c.title.replace(/^File:/, "").slice(0, 50)}\n`);
  await sleep(400);
}
fs.writeFileSync(path.join(STAGE, "repick-manifest.json"), JSON.stringify(manifest, null, 2));
process.stdout.write(`\nStaged ${staged} re-picks of ${pool.length} un-shipped candidate spots -> ${STAGE}\n`);
