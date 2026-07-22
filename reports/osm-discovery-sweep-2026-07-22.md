# OSM Overpass discovery sweep, 2026-07-22

**Question asked:** can OpenStreetMap be used as a *discovery* source for new launch spots, rather than the per-spot corroboration tool it has been so far?

**Answer: barely. It is a weak discovery source for this app, and this sweep is the evidence.** Run it once, record the result, do not re-run it hoping for a different one.

## Method

Overpass query for `leisure=slipway`, `waterway=access_point`, `canoe=put_in` over five named NorCal regions (chosen so a failure is legible, rather than a blind grid). Each returned feature was matched to its nearest record in `data/spots.json` by haversine distance; anything within 500 m was treated as already carried.

Endpoint: `overpass.kumi.systems` (the main `overpass-api.de` returned 406 on a default user agent and 504 on a 5.5-degree bbox; tile and identify yourself).

## Result

| Region | Features | Already carried (<=500 m) | Candidates (>500 m) | **Named candidates** |
|---|---|---|---|---|
| Lake Tahoe | 26 | | 25 | **3** |
| Delta | 36 | | 28 | **2** |
| North coast | 14 | | 10 | **2** |
| Sacramento area | HTTP 504 | | | |
| Sierra foothills | HTTP 502 | | | |
| **Total (3 of 5 regions)** | **76** | **13** | **63** | **~6** |

**The number that matters is the last column. 63 candidates, of which 56 are UNNAMED.** An unnamed slipway node cannot become a record: this app needs a name, a fee, an access policy and a hazard note, and OSM supplies none of them. Ingesting unnamed nodes would be the geocode-and-trust step that produced spot 79, with extra steps.

Named candidates worth a look, each still needing per-site verification from an authoritative source:

- **Lake Forest Public Access** (Tahoe, 10.2 km from Kings Beach)
- **Cave Rock Boat Launch** (Tahoe, 10.0 km from Waterman's Landing)
- **Snug Harbor Slipway** (Delta, 4.0 km from Isleton)
- **Russo's Launch Ramp** (Delta, 7.8 km from Dutch Slough)
- **Boat Dock** near Lake Sonoma (7.9 km)
- **End of Mark West Creek Kayaking Run** (2.7 km from Nagasawa Park) — likely a take-out, not a put-in

## The one genuinely useful finding: a possible pin defect at spot 11

OSM has a slipway named **"Sand harbor"** at `39.200675, -119.930543` (`node/4320621468`), **582 m** from our spot 11 pin at `39.1956, -119.9289`, with a second unnamed node 574 m away.

**This is the parking-vs-dock fingerprint again** (spots 127/130/132, `data-quality-sweep-2026-07-16.md`): our coordinate may be on the beach or the parking area while the actual launch is ~600 m north. Not fixed here, because a coordinate change is a gated edit and needs a second source, per D19/D23. Filed as a lead, not a correction.

## Conclusion

OSM stays what the record already said it was: **good for corroborating a coordinate, poor for finding launches.** It surfaced ~6 named leads across three regions and one possible pin defect, which is a fair return for one afternoon but nowhere near a registry. It does not answer item 45; a source that publishes fees, access and hazards per site still does.

Attribution note if any OSM-derived coordinate is ever used: OpenStreetMap contributors, ODbL.
