#!/usr/bin/env python3
"""Phase 0: SUP spots — geocoding + data enrichment. Output: spots.json"""

import json, re, time, openpyxl, requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "SUP-Spot-Guide/1.0 (qiguo1102@live.com)"}
SLEEP = 1.1  # Nominatim: max 1 req/sec


# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------

def geocode(query):
    try:
        r = requests.get(
            NOMINATIM_URL,
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "us"},
            headers=HEADERS,
            timeout=10,
        )
        results = r.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"]), results[0].get("display_name", "")
    except Exception as e:
        print(f"  error: {e}")
    return None, None, None


def clean_city(city):
    if not city:
        return ""
    city = re.sub(r"\?", "", city).strip()
    return city.split(" - ")[0].strip()  # "Lake Tahoe - Carnelian Bay" -> "Lake Tahoe"


def build_queries(water, city):
    city_c = clean_city(city)
    primary = water.split("/")[0].strip()  # first part of compound names
    queries = []
    if city_c:
        queries.append(f"{primary} {city_c} California")
        queries.append(f"{primary} California")
    else:
        queries.append(f"{primary} California")
    if city_c:
        queries.append(f"{city_c} California")
    return queries


# ---------------------------------------------------------------------------
# Enrichment parsers
# ---------------------------------------------------------------------------

def parse_fees(notes):
    """Returns (launch_fee_int_or_None, has_fee_bool_or_None)."""
    if not notes:
        return None, None
    nl = notes.lower()
    if "no outside watercraft" in nl:
        return None, False  # rentals-only, no personal launch fee
    launch_match = re.search(r"launch[^$]*\$(\d+)", nl)
    if launch_match:
        return int(launch_match.group(1)), True
    dollar_match = re.search(r"\$(\d+)", notes)
    if dollar_match:
        return int(dollar_match.group(1)), True
    return None, False  # no $ mentioned — unknown, not confirmed free


def parse_power_boats(notes):
    if not notes:
        return None
    nl = notes.lower()
    if "power boats not allowed" in nl:
        return False
    if "power boats allowed" in nl:
        return True
    return None


def infer_difficulty(water, notes):
    river_kw = ["river", "creek", "run", "rapids"]
    flat_kw  = ["lake", "reservoir", "lagoon"]
    # slough is tidal (bay), not river; "park"/"point" too broad — excluded
    bay_kw   = ["bay", "cove", "estuary", "slough", "marina", "delta",
                "channel", "harbor", "beach", "shoreline", "landing"]

    parts = [p.strip().lower() for p in water.split("/")]
    full  = water.lower()

    # flatwater wins if any part is a reservoir/lake (e.g. "Stevens Creek Reservoir")
    if any(k in full for k in flat_kw):
        return "flatwater"
    # bay wins over river when any part of a compound name signals tidal/bay water
    if any(k in p for p in parts for k in bay_kw):
        return "bay"
    if any(k in full for k in river_kw):
        return "river"
    return "unknown"


def bool_note(notes, *keywords):
    if not notes:
        return False
    nl = notes.lower()
    return any(k in nl for k in keywords)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

wb = openpyxl.load_workbook("/Users/qg/Downloads/sup.xlsx")
ws = wb["Sheet1"]
data_rows = [r for r in list(ws.iter_rows(values_only=True))[2:] if r[2]]  # skip 2 header rows

spots = []
total = len(data_rows)

for i, (region, city, water, notes) in enumerate(data_rows):
    print(f"[{i+1:2}/{total}] {water[:45]:<45} ({clean_city(city) or '?'})...", end=" ", flush=True)

    lat = lng = display = None
    for query in build_queries(water, city):
        lat, lng, display = geocode(query)
        time.sleep(SLEEP)
        if lat:
            break

    fee_amount, has_fee = parse_fees(notes)

    spot = {
        "id":                 i + 1,
        "region":             region,
        "city":               clean_city(city) if city else None,
        "water":              water,
        "notes":              notes,
        "lat":                lat,
        "lng":                lng,
        "geocode_display":    display,
        "difficulty":         infer_difficulty(water, notes),  # primary name split handled inside
        "fee_amount":         fee_amount,
        "has_fee":            has_fee,
        "power_boats":        parse_power_boats(notes),
        "tide_sensitive":     bool_note(notes, "tide"),
        "dog_friendly":       bool_note(notes, "dog"),
        "rentals_available":  bool_note(notes, "rental"),
        "inspection_required":bool_note(notes, "inspection"),
    }
    spots.append(spot)
    print("OK" if lat else "FAILED", f"-> {lat}, {lng}")

# Write output
out = "/Users/qg/Downloads/spots.json"
with open(out, "w") as f:
    json.dump(spots, f, indent=2, ensure_ascii=False)

failed = [s for s in spots if not s["lat"]]
print(f"\nDone: {len(spots)} spots written to {out}")
print(f"Geocoding failures ({len(failed)}):")
for s in failed:
    print(f"  [{s['id']:2}] {s['water']} ({s['city']})")
