# Item 40 record-accuracy audit

**Date:** 2026-07-17
**Scope:** ROADMAP item 40, split into two phases per the owner's 80/20 direction. This file is appended by the coordinate-correction phase; each phase gets its own heading.

---

## Phase 1: tide_sensitive

**Candidate set (keyword screen fire):** 1, 25, 27, 29, 38, 39, 40, 41, 43, 44, 51, 60, 82, 96.

**Method.** A regex hit on "tide"/"tidal" is not evidence, it cannot tell an assertion from its negation. Each candidate's own `notes` field was read in full and the flag was flipped from `false` to `true` only where the notes unambiguously describe tidal dependence: a required tide window to launch or pass a point, or an explicit statement that the spot is unusable outside one. Where the notes merely label the water "tidal" with no dependency described, or describe a general current characteristic without an action tied to tide state, the flag was held at `false` and logged as ambiguous. Where the notes explicitly negate tidal dependence, the flag was held at `false` as already correct.

**Result: 7 flips, 5 ambiguous holds, 2 negation holds (correctly false, unchanged).**

### Per-spot verdict

| id | difficulty | decision | quoted note |
|---|---|---|---|
| 1 | bay | **FLIP** | "Tidal range runs 9-10 feet, so push off about an hour before low." |
| 25 | bay | **FLIP** | "Stick to mid or high tide or you'll bottom out in the muck before reaching the inner sloughs." |
| 27 | bay | HELD (ambiguous) | "Open San Francisco Bay water with moderate tidal current." |
| 29 | bay | **FLIP** | "paddle upstream past the Bon Air Road bridge at high tide. Tidal, so check the chart and go with the flow." |
| 38 | bay | HELD (ambiguous) | "Watch for afternoon NW winds and opposing tides mid-bay near Hog Island, where chop builds quickly." |
| 39 | bay | **FLIP** | "Unusable at low tide when mudflats extend into the inlet, so check tides before arriving." |
| 40 | river | HELD (ambiguous) | "A mellow tidal stretch through downtown with winery-flanked banks and almost no boat traffic." |
| 41 | bay | **FLIP** | "The creek grows more tidal toward San Pablo Bay, so plan for a mid-to-high tide to keep water under your board." |
| 43 | river | HELD (ambiguous) | "Two put-ins on the same tidal river." |
| 44 | bay | **FLIP** | "Closed March 1 through June 30 for seal pupping; otherwise time mid-to-high tide to avoid stranding on mudflats." |
| 51 | bay | **FLIP** | "Currents at the Gate can hit 6 knots on a strong ebb, so check the tide tables before heading outside the cove." |
| 60 | bay | HELD (negation, correctly false) | "Usable at all tide levels." |
| 82 | flatwater | HELD (ambiguous) | "A rare urban paddle on a tidal lagoon in the heart of Oakland, ringed by parks and grand architecture." |
| 96 | flatwater | HELD (negation, correctly false) | "SF's largest freshwater lake, ringed by a 4.5-mile paved trail and free of tides and currents." |

### Why each ambiguous hold is not a flip

- **27**: "moderate tidal current" describes a characteristic of the open-Bay water at this launch, not a dependency, the notes give no tide window to plan around and no action tied to tide state.
- **38**: "opposing tides" is named as one ingredient of a wind-driven chop hazard on one stretch mid-crossing (paired with "afternoon NW winds"), not a statement that the launch or route depends on tide state.
- **40**: "mellow tidal stretch" labels the water as tidal with no usability constraint attached anywhere in the note.
- **43**: "same tidal river" labels the water as tidal; the rest of the note ("Calm, ideal for mellow out-and-back sessions") describes no dependency.
- **82**: "tidal lagoon" labels the water as tidal with no usability constraint described; the note is otherwise about the launch location and dog policy.

### Why the two negations were held, not flipped

- **60**: "Usable at all tide levels" is an explicit statement that tide state does not gate usability here. Flipping this would contradict the record's own claim.
- **96**: "free of tides and currents" is an explicit statement that the lake has no tidal influence at all. Flipping this would contradict the record's own claim.

### Flipped set (7): 1, 25, 29, 39, 41, 44, 51

All seven notes contain either an explicit tide window instruction ("plan for a mid-to-high tide", "time mid-to-high tide", "push off about an hour before low", "paddle upstream ... at high tide"), an explicit unusable-outside-window statement ("Unusable at low tide when mudflats extend"), or an explicit instruction to check tide state before proceeding tied to a described consequence ("Stick to mid or high tide or you'll bottom out"; "Currents at the Gate can hit 6 knots on a strong ebb, so check the tide tables before heading outside the cove").

**Verification:** `lib/spots.test.ts`, describe block `tide_sensitive corrections (item 40, 2026-07-17)`, asserts the flipped set is `true`, the two negation holds (60, 96) stay `false`, and the five ambiguous holds (27, 38, 40, 43, 82) stay `false`. `git diff data/spots.json | grep '"tide_sensitive"'` shows exactly 7 `false` to `true` line pairs and no other change to the file (no lat/lng lines touched, record count unchanged at 142).

---

## Phase 2: coordinates

**Candidate set (re-verified against primary sources, not trusted from prior reports):** 54, 63, 64, 65, 70, 84, 120, 134.

**Method (settled, not re-litigated this pass).** No single screen moves a pin. Primary registry is the SF Bay Water Trail (BCDC / State Coastal Conservancy), corroborated by OpenStreetMap `leisure=slipway` nodes queried live via the Overpass API, `nominatim.openstreetmap.org` reverse geocodes, and, where a spot falls outside SF Bay Water Trail's Bay-only coverage (Russian River, Del Valle, Folsom Lake), the managing agency's own site (EBRPD, CA State Parks). DBW is a ramp-claim check only and was not used to move or hide anything this pass. Every fetch below ran through `curl` with a browser User-Agent from this session (no WebFetch tool was available; this stands in for the POST-with-UA fallback), and no AI search summary was used as a source.

**Result: 3 moves (two independent sources each), 4 report-only candidates (notes silent on one launch, D19 Q2a: no split/merge this pass), 1 candidate held unmoved for lack of a second source, 0 source-blocked.**

**Correction (second pass, same day).** A prior pass on this task moved spot 134 to a self-derived OSM dock coordinate that neither named source agreed on, and was correctly rejected in review. This pass re-fetched the SF Bay Water Trail page and independently re-queried Nominatim, and moves spot 134's longitude only, to the task's originally-named target, backed by two sources that converge on the same real feature. See the spot 134 entry below for the full re-verification.

### Two-source moves

**Spot 64, Del Valle Regional Park (East Bay, Livermore).**
- **From:** `lat 37.5964755, lng -121.7062012`
- **To:** `lat 37.5862939, lng -121.7037956`
- **Source 1 (OSM):** Overpass query for `leisure=slipway` within 1.5 km of the stored point returns node `1635821794`, tagged `name=Del Valle Boat Ramp`. `nominatim.openstreetmap.org/reverse` on that node confirms `class=leisure, type=slipway, name=Del Valle Boat Ramp, road=East Shore Trail`.
- **Source 2 (record's own notes + agency site):** The spot's own notes say "Launch from the East Beach ramp." EBRPD's official Del Valle Regional Park page (`ebparks.org/parks/del-valle`, fetched live) confirms: "You can rent motorboats and patio boats at the East Beach marina area... Any size boat may be launched at the public boat ramp."
- **Why it moved:** The stored coordinate reverse-geocodes to `Canyon Trail` (`class=highway, type=track`), a hiking trail roughly 1.4 km from the East Beach boat ramp, i.e. nowhere near a launch. This is not a rounding error, it is the wrong side of the lake.
- **Confidence:** High. Two independent, named, live-fetched sources converge on the same OSM node, and the stored point resolves to a hiking trail with no water access.

**Spot 65, Jack London Square / Estuary Park (East Bay, Oakland).**
- **From:** `lat 37.7953, lng -122.2773`
- **To:** `lat 37.7901745, lng -122.2659597`
- **Source 1 (record's own notes, D19 Q2a):** "Estuary Park at the Jack London Aquatic Center is the dedicated small-craft launch on this stretch, with a wide ADA gangway and low-freeboard dock used by kayakers, rowers, and dragon-boat crews."
- **Source 2 (SF Bay Water Trail):** `sfbaywatertrail.org/trailhead/estuary-park/` (fetched live) embeds the trailhead location at `37.79017451, -122.26595967`, matching the moved coordinate to 7 decimal places.
- **Corroboration:** Overpass returns an OSM `leisure=slipway` way (`372247285`) ~130 m away, inside the same Estuary Park complex. `nominatim.openstreetmap.org/reverse` on the Water Trail point classifies it `man_made=pier` at `Embarcadero West, Downtown Oakland`, consistent with a dock, not a road or parking lot.
- **Confidence:** High. Own notes plus the Water Trail's published trailhead coordinate, with an OSM slipway inside the same park as a third confirming data point.

**Spot 134, Eden Landing Ecological Reserve (East Bay, Hayward).**
- **From:** `lat 37.6221119, lng -122.1246736`
- **To:** `lat 37.6221119, lng -122.1224849` (longitude only; latitude unchanged, per the settled task target)
- **Source 1 (SF Bay Water Trail).** `sfbaywatertrail.org/trailhead/eden-landing/` (fetched live via `curl` with a browser User-Agent). Its Directions section reads: "To access the launch, take the Clawiter Road/Eden Landing Road exit from Highway 92, and go south of the highway on Eden Landing Road to the end, near the intersection of Arden Road," and its embedded "Google Maps Directions" link carries the coordinate pair `!8m2!3d37.6221077!4d-122.1224849` for that Eden Landing Road end. `37.6221077` matches the record's stored latitude (`37.6221119`) to within ~0.5 m, isolating the defect to the corrupted longitude, exactly as the task brief described. `-122.1224849` is the corrected longitude.
- **Source 2 (Nominatim reverse geocode, independently queried).** `nominatim.openstreetmap.org/reverse?lat=37.6221119&lon=-122.1224849` (fetched live, separate request from Source 1) returns `class=amenity, type=parking, road=Eden Landing Road, Hayward`, an unambiguous, named, on-the-ground feature, not a road centroid or freeway. This corroborates that the corrected coordinate is a real, specific place consistent with the Water Trail's own written directions to the road-end parking area.
- **Why this is the parking, not the dock, and why that is the correct move anyway.** The record's own notes disclose the walk: "An ADA gangway leads to a high-freeboard dock... About 30 free parking spaces sit a quarter mile away." An OSM `leisure=slipway` node named `Eden landing Kayak Launch` (way `1053189423`, confirmed live via `nominatim.openstreetmap.org/lookup?osm_ids=W1053189423`) sits centered `37.6186813, -122.1237187`, about 390 m from the corrected point, matching the Water Trail's own "approximately 1/4-mile" (~402 m) claim. **This report does not move the pin to that OSM dock node.** A prior pass on this task did, and was correctly rejected: the two sources do not converge on that point (only OSM names it; the Water Trail page is used solely as a distance argument to a different coordinate), and Nominatim reverse geocode on the OSM point itself returns `Eden Landing Bay Trail` (`highway=path`), not a launch. Moving there would repeat the exact failure this audit exists to prevent, a single-source, self-derived coordinate. The corrected point (Water Trail's own published road-end coordinate, independently confirmed by Nominatim as the parking lot the notes already describe) matches CLAUDE.md's own precedent for this exact pattern: a disclosed Water Trail parking coordinate, where the notes name the walk to the launch, is treated as correct as stored elsewhere in this dataset (the 127/130/132 block). No second source places a pin at the dock itself, so the dock is left as a candidate for a future pass with better sourcing, not moved to on this one.
- **Confidence:** High for the longitude correction itself (two independently fetched, converging sources on the same real, named, on-the-ground feature); the pin still represents the parking area rather than the exact dock ~390 m away, consistent with this dataset's existing disclosed-parking convention.

### Report-only candidates (notes silent on one launch; nothing edited)

**Spot 54, Russian River (Sonoma/Mendocino).** Notes name two put-ins: "Johnson's Beach and Veterans Memorial Beach," both in Guerneville, with no single launch designated for this record. No move made (D19 Q2a). Separately, and worth flagging: the stored coordinate (`38.7934688, -123.0043152`) reverse-geocodes via Nominatim to `Kelly Road, Cloverdale, Sonoma County` (`class=highway, type=service`), a location roughly 30 km north of Guerneville/Healdsburg, the towns the notes actually describe. This is a materially larger discrepancy than a launch-choice ambiguity and should be prioritized for a future pass, ideally alongside a decision on whether this record should split into two (Johnson's Beach vs. Veterans Memorial Beach) rather than move to either.

**Spot 63, Berkeley Marina (East Bay, Berkeley).** Notes say only "Launch from the public beach," no specific beach named. Stored coordinate (`37.8678664, -122.3130528`) reverse-geocodes to the "F G H I lots" parking area at Berkeley Marina, a plausible general location for "the public beach" but not confirmed against a named launch feature. No move made.

**Spot 70, Richmond Marina (East Bay, Richmond).** The record is itself "Richmond Marina," and its notes name three *other* launches as alternatives on the same basin (Shimada Friendship Park, Vincent Park, Marina Bay Yacht Harbor) without designating one as this record's own put-in. Stored coordinate (`37.9138915, -122.3456721`) reverse-geocodes to a residential address on Commodore Drive in Marina Bay. No move made; the three named alternatives are candidates for separate future records, not a move target for this one.

**Spot 84, MLK Jr. Regional Shoreline (East Bay, Oakland).** Notes describe "a free two-lane launch off Doolittle Drive." The stored coordinate (`37.7387, -122.214`) reverse-geocodes to "Doolittle Beach Staging Area" on Doolittle Drive, i.e. it already matches the launch the notes describe; no discrepancy found. Held in the report-only bucket per the settled D19 Q2a scope for this batch (multi-launch-shoreline records), not edited.

### Held: insufficient second source

**Spot 120, Folsom Lake / Beals Point (Sacramento, Folsom).** Notes: "Beals Point has a ramp, beach, and parking." The stored coordinate (`38.7193431, -121.172901`) is byte-identical (once trailing-zero JSON formatting is accounted for) to OpenStreetMap's centroid for "Beals Point Campground," not the boat ramp. Overpass queries for `leisure=slipway`, `amenity=boat_ramp`, and `natural=beach` within 1.5-2.5 km of the stored point returned no results, and `parks.ca.gov`'s Folsom Lake SRA page (fetched live) surfaces only the park's general entrance coordinate, ~1.5 km away, not a Beals Point-specific one. One source (OSM campground centroid) shows the pin sits at the campground rather than the ramp, but no second independent source pinpoints the ramp itself. Per the no-single-screen rule, held unmoved and flagged as a candidate for a future pass with a better source (e.g. a State Parks facility map PDF).

### UNVERIFIED (source-blocked)

None this batch. All sources needed for the 8 candidates (SF Bay Water Trail, OpenStreetMap/Overpass, Nominatim, EBRPD, CA State Parks) returned HTTP 200 via `curl` with a browser User-Agent; no Cloudflare/403 block was hit on Marin, sccgov, or EBRPD domains this pass.

### Per-spot verdict table

| id | water | verdict | confidence | sources |
|---|---|---|---|---|
| 54 | Russian River | report-only (notes name 2 put-ins, no single launch; large location discrepancy flagged) | n/a, no edit | Nominatim reverse geocode (Kelly Road, Cloverdale) |
| 63 | Berkeley Marina | report-only (notes name no specific beach) | n/a, no edit | Nominatim reverse geocode (Berkeley Marina lots) |
| 64 | Del Valle Regional Park | **MOVED** to East Beach boat ramp | high | OSM slipway node `Del Valle Boat Ramp` + EBRPD `ebparks.org/parks/del-valle` + own notes |
| 65 | Jack London Square | **MOVED** to Estuary Park | high | Own notes (D19 Q2a) + SF Bay Water Trail `trailhead/estuary-park` |
| 70 | Richmond Marina | report-only (notes name 3 alternative launches, none is this record's own) | n/a, no edit | Nominatim reverse geocode (Commodore Drive) |
| 84 | MLK Jr. Regional Shoreline | report-only (D19 Q2a scope; stored coord already matches notes) | n/a, no edit | Nominatim reverse geocode (Doolittle Beach Staging Area) |
| 120 | Folsom Lake / Beals Point | held, unmoved (only 1 source found; stored coord = campground centroid, not ramp) | n/a, no edit | OSM (Beals Point Campground) only, no second source found |
| 134 | Eden Landing Ecological Reserve | **MOVED** (longitude only) to the Water Trail's published road-end coordinate | high | SF Bay Water Trail `trailhead/eden-landing` embedded map coordinate + Nominatim reverse geocode (independently confirms `amenity=parking` at that exact point) |

**Count of pins moved with two named sources: 3 (spots 64, 65, 134), each traceable to a line in the `data/spots.json` diff.**

**Verification:** `lib/spots.test.ts`, describe block `coordinate corrections (item 40, 2026-07-17)`, asserts the three moved spots equal their exact new `lat`/`lng` values and that spot 127 (a member of the untouched 6-decimal Water Trail parking block) retains its stored coordinate. `git diff data/spots.json | grep -E '^[+-].*"(lat|lng)"'` shows exactly 3 from/to coordinate pairs, matching the three moves above and no other spot, with the record count unchanged at 142.
