# Coordinate audit: 11 flagged spots (ROADMAP item 40)

**Date:** 2026-07-16
**Status:** PROPOSAL FOR OWNER APPROVAL. Nothing has been edited.
**Scope:** the 11 spots flagged in ROADMAP item 40 as "too coarse for the pin to be on the launch."
**Method:** OSM Overpass (`leisure=slipway`, `canoe=yes`, `waterway=access_point`), Nominatim forward + reverse geocode, US Census geocoder, CA State Parks Division of Boating and Waterways (DBW) facility registry, SF Bay Water Trail, official park/marina/agency pages.

`data/spots.json` was NOT modified. Per CLAUDE.md, no spot is overwritten without owner manual review.

---

## Headline

**The decimal-count heuristic has a ~36% false-positive rate.** Four of the 11 flagged spots (38, 48, 84, 104) already sit within 45m of a real, OSM-tagged launch. Their coarse-looking values are JSON dropping trailing zeros, exactly the caveat item 40 anticipated. **Do not touch them.**

The heuristic also **understated** the two worst real errors. Donner is 3.8km off, not the 1.1km its 2dp implies. Dutch Slough is not just mis-pinned, it is pointed at **the wrong facility entirely**.

And it **missed the most serious defect**, which is not a coordinate problem at all: **spot 79 (Coyote Creek) appears to describe a put-in that does not exist as a legal public launch**, inside a normally-closed National Wildlife Refuge.

| Verdict | Count | IDs |
|---|---|---|
| Already correct, no change | 4 | 38, 48, 84, 104 |
| Confident repair, ready to apply on approval | 3 | 88, 96, 102 |
| Optional refinement, medium confidence | 2 | 45, 112 |
| **Cannot resolve, owner input required** | 2 | **76, 79** |

---

## Proposal table

| id | Spot | Current lat,lng | Proposed lat,lng | Dist | Confidence | Source | Verdict |
|---|---|---|---|---|---|---|---|
| 38 | Miller Boat Launch, Marshall | `38.2, -122.9215` | **no change** | 14m | high | OSM node/4878780335 `leisure=slipway name="Miller Boat Launch"`; reverse-geocodes to "Miller Boat Launch, Dock" | **FALSE POSITIVE. Correct as-is.** |
| 45 | China Camp, San Rafael | `38.001, -122.4617` | `38.0009, -122.4612` | 45m | medium | OSM beach way/630852536; Friends of China Camp; SF Bay Water Trail | Minor. Sits among village buildings, ~45m inland of beach. Optional. |
| 48 | Nagasawa Park, Santa Rosa | `38.4833, -122.716` | **no change** | 15m | high | OSM node/5817093285 `leisure=slipway` | **FALSE POSITIVE. Correct as-is.** |
| 76 | Brisbane Marina Ramp | `37.6741, -122.382` | **NONE, do not guess** | n/a | **low** | see notes | **UNRESOLVED. Ramp may not exist.** |
| 79 | Coyote Creek Tidal Launch | `37.456, -121.922` | **NONE, do not guess** | n/a | **low** | see notes | **UNRESOLVED. Likely not a legal launch. Safety issue.** |
| 84 | MLK Jr. Regional Shoreline | `37.7387, -122.214` | **no change** | 32m | high | OSM node/2427025918 `leisure=slipway`, on Doolittle Trail | **FALSE POSITIVE. Correct as-is.** |
| 88 | Dutch Slough, Oakley | `38.001, -121.7` | `38.01109, -121.638585` | **5,503m** | high (identity) / medium (coord) | DBW f/919; sunsetmarinaca.com JSON-LD; Census geocode of 3040 Dutch Slough Rd = `38.0115, -121.6400` | **WRONG FACILITY + 5.5km off. Needs rename, not just re-pin.** |
| 96 | Lake Merced, SF | `37.718, -122.493` | `37.72574, -122.49872` | **998m** | high | OSM way/1309877470 `leisure=slipway`; DBW f/492 (1 Harding Blvd, type "Launch") | **Lake centroid, and wrong half of the lake.** |
| 102 | Donner Lake, Truckee | `39.3208, -120.24` | `39.32482, -120.28356` | **3,778m** | high | DBW f/663 (15511 Donner Pass Rd, "northwest corner"); OSM "Donner Lake Launching Facility" polygon | **Wrong end of the lake. 3.4x worse than flagged.** |
| 104 | Echo Lakes | `38.835, -120.044` | **no change** | 45m | high | OSM way/1252551204 `leisure=slipway`, adjacent to Echo Chalet; DBW f/726 | **FALSE POSITIVE. Correct as-is.** |
| 112 | Morro Bay | `35.372, -120.8616` | `35.3718, -120.8616` | 22m | medium | OSM Coleman Park way/43702333 + coastline way/479827627 | Park centroid, but park is a shoreline strip. Water is 22m away. Optional. |

---

## Per-spot notes

### 38. Miller Boat Launch, Marshall. NO CHANGE.
The "~11km off" flag is wrong. `38.2, -122.9215` reverse-geocodes to **"Miller Boat Launch, Dock, Blakes Landing"** and sits **14m** from OSM `node/4878780335`, tagged `leisure=slipway, name=Miller Boat Launch`. The lat is `38.2` because the true value rounds there, not because it is coarse. This is the textbook trailing-zero false positive. **Leave it alone.**

### 45. China Camp, San Rafael. OPTIONAL, medium confidence.
Current sits ~20m from the OSM "China Camp Historic Area" node, i.e. among the village buildings, ~34-45m inland of the beach. Launching is legal **anywhere along the quarter-mile beach**, so the current pin is already within a stone's throw of a valid put-in.

Two candidate refinements, and I could not resolve between them:
- `38.0009, -122.4612`, waterline at the beach beside the pier base (~45m from current).
- `~38.0003, -122.4609`, the **marked** launch area at the south end of the parking lot, per Friends of China Camp (~105m from current).

**Do NOT adopt the SF Bay Water Trail coordinate** (`38.00054179471353, -122.46132006698895`). Despite 14 decimal places of apparent precision, it matches OSM parking lot way/630852538 to within 8m: **it is the parking lot, not the put-in.** A perfect illustration of item 40's "precision is not accuracy" thesis.

**Multiple launches: YES.** The park designates **two** put-ins, China Camp Village and **Bullhead Flat**, and directs paddlers to use only those to avoid wetland damage. Product question for the owner.

Also: the notes' tide warning is real but understated. Sources say plan to launch **and land** at mid-to-high tide only; at low tide mudflats extend several hundred yards and return can become infeasible.

### 48. Nagasawa Park, Santa Rosa. NO CHANGE.
OSM `node/5817093285` `leisure=slipway` is **15m** from the current coordinate. Correct as-is. False positive.

### 76. Brisbane Marina Ramp. UNRESOLVED. Owner input required.
**I cannot confirm that this ramp exists**, let alone place it. Do not ship a coordinate here.

- The City of Brisbane's own [Marina page](https://www.brisbaneca.gov/167/Marina) lists the guest dock, fuel dock, and 300-ft public fishing pier. **No launch ramp.**
- **DBW classifies Brisbane Marina as type "Marina," not "Marina/Launch"**, compare Lake Merced, which DBW explicitly types as "Launch."
- The 19-page SFBAMA Bay Area launch ramp guide mentions **Brisbane and Sierra Point zero times**.
- Brisbane Marina is **not** an SF Bay Water Trail trailhead.
- **OSM has no slipway or marina mapped anywhere at Sierra Point.**
- The nearest tagged slipway (1.4km SE, `fee=yes charge=13USD access=customers`) is confirmed **Oyster Point Marina, South San Francisco**, a different city and a different facility.

**Provenance of the current coordinate is the tell.** fishing.org lists "Brisbane Marina Ramp" at `37.67410000, -122.38200278`, **bit-for-bit our stored value**. That directory cites no source and asserts no physical ramp. The point lands **on the Sierra Point Parkway roadway**, ~165m west of the marina basin. This looks like a street-address geocode of "400 Sierra Point Pkwy" that a directory dressed up as a ramp, and we inherited it.

(Sierra Point and Brisbane Marina **are** the same place, so the notes are not internally contradictory. That is not the problem.)

**Owner needs to supply one of:** a call to the harbormaster (650-583-6975) confirming a public launch and its location; a dropped pin from personal knowledge; or a decision to delist. Until then this spot's core claim ("Public concrete ramp at Sierra Point") is unsupported.

### 79. Coyote Creek Tidal Launch, Milpitas. UNRESOLVED. **Escalate: safety and legal.**
This is the most serious finding in the audit and it is **not** a coordinate problem.

The current coordinate reverse-geocodes to **the Nimitz Freeway (I-880) in Fremont**, on a highway, in the wrong county. That much is simply wrong. But the repair is not available, because **I could not find any designated or legally sanctioned public kayak/SUP put-in on Coyote Creek off McCarthy Boulevard**, from any of: fws.gov (Don Edwards NWR), Santa Clara Valley Water, City of Milpitas, County Parks, or the SF Bay Water Trail. The Water Trail lists exactly two Santa Clara County sites, and neither is this. OSM has no slipway within 6km.

**The likely provenance is alarming.** There is a real matching address, the **Coyote Creek Trail trailhead, 1425 N. McCarthy Blvd**, but it is a **hiking/biking trailhead, not a boat launch**. The single documented paddle from it is a [South Bay Salt Ponds trip report](https://www.southbayrestoration.org/blog/kayak-trip-island-ponds) which states the location is "in a part of the Don Edwards National Wildlife Refuge that is usually closed to the public. We were granted special permission as a planned trip with Ducks Unlimited," and tells readers directly: **"Do not paddle there on your own. It's unsafe, illegal, and disruptive to wildlife."**

Search-engine AI summaries have repeatedly laundered that post into "1425 N. McCarthy Blvd is a kayak launch point," stripping the permit and the warning. That is a plausible origin for this record.

**Corroborating signal that the record is not sourced from reality:** its notes claim "some sections close March through August for heron nesting." The actual documented closure is **February to September**, for the endangered **California Ridgway's rail**. Wrong months, wrong species. The 1.5 mph / 9-to-10-foot tidal figures could not be corroborated either.

**Recommendation: delist or hide this spot, do not repair it.** Publishing any coordinate here risks directing paddlers into a closed National Wildlife Refuge section where launching is illegal, during endangered-bird breeding season. Given ROADMAP items 34/35 (the alert-copy and waiver work already in flight on liability grounds), this warrants a look from the `lawyer` gate.

**Alviso Marina is not the answer.** It is a real Water Trail launch at `37.42928, -121.98166`, but it is 6km away, in San Jose, on Alviso Slough, off a different access road. Adding it would be **a new spot record**, not a coordinate fix for this one.

### 84. MLK Jr. Regional Shoreline, Oakland. NO CHANGE.
OSM `node/2427025918` `leisure=slipway` is **32m** from current, on Doolittle Trail, matching the notes' "free two-lane launch off Doolittle Drive." Correct as-is. False positive.

### 88. Dutch Slough, Oakley. **WORST OFFENDER. Wrong facility, not just wrong pin.**
The stored point `38.001, -121.7` reverse-geocodes to the **Marsh Creek Regional Trail** and lands inside the **Dutch Slough Tidal Restoration Project** nature reserve (CA Dept. of Water Resources land). That is the "open country" item 40 saw: it is a *restoration project* named Dutch Slough, not a launch. Actual error **5.5km** (not 11km).

**The deeper problem is identity.** The stored `geocode_display` says *"Viking Harbor / Dutch Slough Boat Launch, 2140 Dutch Slough Rd."* Per the DBW registry:

| Facility | Address | DBW type | DBW access |
|---|---|---|---|
| **Viking Harbor** | 2140 Dutch Slough Rd | **Marina** (no launch) | **"Other"** (not public) |
| **Sunset Harbor and RV** | 3040 Dutch Slough Rd | **Marina/Launch** | **Public** |

**2140 / Viking Harbor has no launch ramp and is not public.** It is currently listed for sale as a **multi-family residential property** (nine units, built 1946) with a private 24-slip dock. Every attribute in our notes, 24-hour, public, $10 fee, dock ramps on both sides, maps instead to **Sunset Harbor Marina at 3040 Dutch Slough Rd**, "right next to the Bethel Island Bridge."

**Proposed: `38.01109, -121.638585`** (JSON-LD `GeoCoordinates` from sunsetmarinaca.com). Independent corroboration: the US Census geocoder puts 3040 Dutch Slough Rd at `38.0115, -121.6400`, ~200m away, consistent, and both sit ~230m SE of the Bethel Island Rd bridge over Dutch Slough. **Identity confidence high; coordinate confidence medium**. OSM maps no slipway anywhere on Dutch Slough Rd, and the JSON-LD point is a business coordinate, not a surveyed ramp apron (±~100m).

**Owner decision required: this needs a rename, not a silent re-pin.** Moving the pin alone would leave a spot named and addressed for a private residential marina. Rename to Sunset Harbor Marina and re-point, or drop.

### 96. Lake Merced, San Francisco. Confident repair.
Current `37.718, -122.493` is **open water**, 199m from the OSM lake polygon centroid. It is a **lake centroid**, and worse, it is in **South Lake** while the launch is on **North Lake**.

**Proposed: `37.72574, -122.49872`**. OSM way/1309877470, a 58m concrete `leisure=slipway` beside the boathouse off Harding Road. Corroborated by DBW facility 492 (1 Harding Blvd, type **"Launch"**) and the new ADA dock, described as "on the North Lake, across from the Lake Merced Boathouse on the left side of the entrance road to Harding Park Golf Course." Census geocode of 1 Harding Rd lands within ~50m. **998m from current. Confidence high.**

**Multiple launches: effectively no**, the ramp and the new ADA dock are the same site.

**Flag on the notes (separate from coordinates):** `rentals_available: true` looks **wrong**. The SF Rec & Park Boathouse page is about **event-space rentals** (meeting room, caterer's kitchen), not boats. The SFSU Boathouse does offer kayak/SUP but is explicitly **"open to all SF State students, faculty, and staff"**, not the public. Pacific Rowing Club shows as closed. No public SUP rental found at Lake Merced.

### 102. Donner Lake, Truckee. Confident repair, and worse than flagged.
Current `39.3208, -120.24` reverse-geocodes to **South Shore Drive**, the wrong end of the lake from the ramp the notes describe ("public ramp on the northwest shore"). Real error **3,778m**, not the 1.1km the 2dp implied.

**Proposed: `39.32482, -120.28356`.** Chain of evidence: DBW f/663 and TDRPD both give the public ramp as **15511 Donner Pass Road, "northwest corner of Donner Lake,"** 2 lanes, 30 trailer spaces. That address geocodes (Nominatim) to `39.324915, -120.282699`, **75m** from the OSM slipway. Decisively, OSM has a polygon literally named **"Donner Lake Launching Facility"** enclosing both the slipway node (4457353788) and the slipway service way (793665230). **Confidence high.**

**Reject the near node.** OSM `node/4317739576` is only 534m from current, which makes the stored pin *look* roughly plausible on a map, but it is at the **far east end**, unnamed, and probably the **members-only Tahoe Donner Beach Club Marina** launch. Snapping to the nearest slipway would have been the wrong move. This is the trap in this spot.

**Multiple launches: YES, and this is a real product question.** Donner has at least five distinct access points:
1. **TDRPD public boat ramp** (NW, 15511 Donner Pass Rd), fee $15/day CA resident, $30 out-of-state, $125 season; watercraft inspection sticker required from Truckee PD before first launch.
2. **37 first-come public piers**, verified in OSM (36 numbered `ref` 1-37 with #26 absent, plus 2 unnumbered), all `operator=Truckee-Donner Recreation & Park District`, `access=yes`, `reservation=no`. They run **~3.5km along the north shore** (pier 1 at `39.32476, -120.28205` to pier 37 at `39.32689, -120.24158`). **One pin cannot represent these.** Our notes already mention them.
3. **West End Beach Park** (`39.32203, -120.28993`). TDRPD, SW corner, **kayak/SUP rentals and board storage racks**, $8 resident / $12 non-resident. **For a paddleboard app this is arguably the more relevant put-in than a trailer ramp.**
4. **Donner Memorial State Park** (E/SE), rentals.
5. **Tahoe Donner Beach Club Marina** (E), members-only.

The proposal above points at the trailer ramp because that is what the notes describe. **The owner may prefer West End Beach.** Flagging rather than deciding.

### 104. Echo Lakes. NO CHANGE.
OSM way/1252551204 (`leisure=slipway`) is **45m** from current, sitting directly between the **Echo Chalet** building (38.834651, -120.0438321, tagged with echochalet.com) and Echo Lake Dam. DBW f/726 confirms Echo Chalet as a public Marina/Launch at 9900 Echo Lakes Road. The current pin is already on the Chalet/dam apron. Refining to `38.83475, -120.04441` is cosmetic. **Confidence high. Leave it.**

### 112. Morro Bay. OPTIONAL, medium confidence.
Current `35.372, -120.8616` is **2m from the centroid of Coleman Park** (OSM way/43702333), so it *is* a park centroid, but a lucky one: the park is a thin shoreline strip whose southern edge **shares nodes with the bay coastline**. The waterline due south is **~22m away**. The current pin is already effectively on the put-in.

**Proposed (optional): `35.3718, -120.8616`**, the bay-side waterline. Medium confidence: no source publishes a coordinate for the beach entry itself; this is derived from OSM coastline geometry.

**Ambiguity:** morrobay.org pins "Coleman Park & Beach" (101 Coleman Dr) at `35.370922, -120.863867`, 238m SW and ~27m *inland*, near the Morro Rock parking lots. The launchable beach plausibly runs the whole bay side of Coleman Drive, so both are "Coleman." The notes' "easiest entry at any tide" is corroborated.

**Multiple launches: YES, at least four**. Coleman Park beach (this spot); **Tidelands Launch Ramp** at `35.357557, -120.850335` (OSM way/319621776, `access=yes`, **`fee=no`**, concrete, 1.9km away, works at any tide); Morro Bay State Park Marina (10 State Park Rd); Baywood Park (1st St ramp, high tide only). Product question for the owner.

---

## Cross-cutting findings for item 40 and item 45

1. **The decimal-count heuristic is a weak screen.** 4/11 false positives (36%), and it understated both worst cases. Two better tests, both cheap and both automatable across all 142 spots:
   - **Does the coordinate reverse-geocode to a road, a trail, a freeway, or a polygon centroid?** This caught 79 (freeway), 88 (regional trail), 96 (lake centroid), 76 (roadway), 102 (wrong-shore road), every real error in this batch, and it produced zero false positives.
   - **Does an authoritative registry confirm the facility type?** DBW types facilities as "Marina" vs "Marina/Launch" vs "Launch," and access as Public vs Other. That single field independently flagged 76 (Marina, not Launch) and 88 (Viking Harbor: Marina, not public).

2. **The real defect is not precision, it is provenance.** Every genuine error here is an **automated geocode of a street address or a polygon centroid**, never an observed put-in. Spot 76's coordinate is byte-identical to an unsourced fishing directory entry. Spot 79 appears to be an AI-summary artifact of a permit-only trip report. **ROADMAP item 40's premise correction is right, and should go further: the pipeline's problem is that it never had a launch coordinate to begin with.**

3. **This strengthens the case for item 45 staying blocked.** Item 40 already blocks item 45 on the 11km errors. The Coyote Creek finding is a stronger argument: the pipeline can emit a **plausible-looking spot that does not exist**, with notes containing invented specifics (wrong species, wrong closure months). Expanding coverage through it would scale fabrication, not just imprecision.

4. **"Multiple distinct launches" is a live data-model question**, not an edge case. It affects at least 4 of 11 audited spots (45, 102, 112, and arguably 96). Donner is the sharp case: one record cannot represent a trailer ramp, a SUP beach, and 37 piers strung along 3.5km, and the SUP-relevant answer (West End Beach) is not the one the notes describe.

5. **Note fields need auditing too, independently of coordinates.** This pass incidentally found: spot 96 `rentals_available: true` (likely wrong, no public rental); spot 79 closure months and species (both wrong); spot 88 named for the wrong facility. Coordinates were the brief, but they are not the only thing the pipeline got wrong.

---

## Recommended owner actions

**Approve (3 high-confidence repairs):**
- **88**, re-point to `38.01109, -121.638585` **and rename** to Sunset Harbor Marina, or drop. Verify `has_fee`/`fee_amount` still hold for the correct facility.
- **96**, re-point to `37.72574, -122.49872`. Separately consider `rentals_available: false`.
- **102**, re-point to `39.32482, -120.28356`, **or** decide West End Beach (`39.32203, -120.28993`) is the better SUP put-in.

**Leave alone (4 false positives):** 38, 48, 84, 104.

**Optional, your call (2):** 45 (`38.0009, -122.4612`), 112 (`35.3718, -120.8616`). Both are already within ~45m; the gain is marginal.

**Decide (2):**
- **76**, call the harbormaster (650-583-6975) or drop a pin from personal knowledge. If no public ramp exists, delist.
- **79**. **recommend delist or hide.** Suggest routing through the `lawyer` gate given the closed-refuge and endangered-species exposure.

---

## Sources

OpenStreetMap via Overpass API (ODbL) · [Nominatim](https://nominatim.openstreetmap.org/) · [US Census Geocoder](https://geocoding.geo.census.gov/) · [DBW Donner Lake Boat Ramp f/663](https://dbw.parks.ca.gov/BoatingFacilities/f/663) · [TDRPD Donner Boat Ramp](https://www.tdrpd.org/210/Donner-Boat-Ramp) · [TDRPD West End Beach](https://www.tdrpd.org/165/West-End-Beach) · [DBW Lake Merced f/492](https://dbw.parks.ca.gov/BoatingFacilities/f/492) · [DBW Sunset Harbor f/919](https://dbw.parks.ca.gov/BoatingFacilities/f/919) · [DBW Viking Harbor f/1329](https://dbw.parks.ca.gov/BoatingFacilities/f/1329) · [DBW Oakley facilities](https://dbw.parks.ca.gov/BoatingFacilities/City/Oakley) · [DBW Brisbane facilities](https://www.parks.ca.gov/BoatingFacilities/City/Brisbane) · [DBW Echo Chalet f/726](https://dbw.parks.ca.gov/BoatingFacilities/f/726) · [Sunset Harbor Marina](https://sunsetmarinaca.com/) · [City of Brisbane Marina](https://www.brisbaneca.gov/167/Marina) · [SFBAMA Bay Area launch ramp guide (PDF)](https://sfbama.org/wp-content/uploads/2021/07/Launch-Ramps-in-the-Bay-Area-20210704-v5.pdf) · [SF Bay Water Trail trailheads](https://sfbaywatertrail.org/trailheads/) · [SF Bay Water Trail: China Camp](https://sfbaywatertrail.org/trailhead/china-camp-state-park/) · [SF Bay Water Trail: Alviso Marina](https://sfbaywatertrail.org/trailhead/alviso-marina-county-park/) · [Friends of China Camp](https://friendsofchinacamp.org/visit-the-park/activities/) · [South Bay Salt Ponds trip report](https://www.southbayrestoration.org/blog/kayak-trip-island-ponds) · [Don Edwards NWR](https://www.fws.gov/refuge/don-edwards-san-francisco-bay/visit-us/activities) · [SF Rec & Park Lake Merced Boathouse](https://sfrecpark.org/663/Lake-Merced-Boathouse) · [SFSU Boathouse](https://campusrec.sfsu.edu/Boathouse) · [Morro Bay: Coleman Park & Beach](https://www.morrobay.org/directory/coleman-park-beach/)
