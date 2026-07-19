#!/usr/bin/env python3
"""Precompute the NWS `/points/{lat},{lng}` -> forecast-gridpoint URL for every
spot, so the runtime wind fetch is ONE hop (the forecast) instead of TWO (resolve
the gridpoint, then fetch it). NWS gridpoints are stable for a fixed lat/lng, so
this is safe to bundle like data/spots.json and refresh only occasionally.

Output: data/gridpoints.json, a flat map "<lat4>,<lng4>" -> "<forecast url>".
The key is the 4-decimal lat/lng string that lib/conditions.ts fetchWind builds
(`lat.toFixed(4),lng.toFixed(4)`); a spot whose key is absent (or whose rounding
differs) simply falls back to the live two-hop, so partial output is safe.

Requires network. Usage: python3 scripts/precompute_gridpoints.py
"""
import json
import os
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "paddle-to-water (https://paddletowater.com)"

spots = json.load(open(os.path.join(ROOT, "data/spots.json")))
existing = {}
gp_path = os.path.join(ROOT, "data/gridpoints.json")
if os.path.exists(gp_path):
    existing = json.load(open(gp_path))

out = dict(existing)  # keep any prior entries; only add/refresh what we can reach
ok = fail = skip = 0
seen = set()
for s in spots:
    if s.get("hidden"):
        continue
    key = f"{s['lat']:.4f},{s['lng']:.4f}"
    if key in seen:
        continue
    seen.add(key)
    url = f"https://api.weather.gov/points/{key}"
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": UA, "Accept": "application/geo+json"}
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.load(r)
        fc = data.get("properties", {}).get("forecast")
        if fc:
            out[key] = fc
            ok += 1
        else:
            skip += 1
            print(f"no forecast for {key}")
    except Exception as e:  # noqa: BLE001 - best effort; a miss just falls back
        fail += 1
        print(f"FAIL {key}: {e}")
    time.sleep(0.12)

json.dump(out, open(gp_path, "w"), indent=0, sort_keys=True)
open(gp_path, "a").write("\n")
print(f"\nwrote {len(out)} gridpoints ({ok} ok, {fail} failed, {skip} no-forecast, {len(seen)} unique keys)")
