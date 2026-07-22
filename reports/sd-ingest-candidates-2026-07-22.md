# San Diego County ingest: candidates and the manual-lookup list

Source: CCC YourCoast full pull, 2026-07-22. Same method as `la-ingest-candidates-2026-07-22.md`.

## What the filter produced

| | LA (for comparison) | **San Diego** |
|---|---|---|
| County records | 230 | **197** |
| `BOATING = Yes` | 37 | **40** |
| Paddle-plausible after filtering | 51 | **65** |
| ...explicit launch type | 11 | **17** |
| ...**paddle-specific** (hand / kayak / small-craft) | 2 | **6** |
| Already within 500 m of an existing spot | 0 | **0** |

**San Diego is the better county, as expected.** It has three times LA's paddle-specific launches, and most of them sit in Mission Bay, which is protected, purpose-built for watersports, and the densest paddle water in the state.

## The 6 paddle-specific candidates, tiered

**Tier 1, protected water and paddle-typed. Strongest in the state so far.**

| Name | Type | CCC fee | Location |
|---|---|---|---|
| **El Carmel Point** | Small-Craft Boat Launch | No | Mission Bay, "Bay beach, kayak launch" |
| **Playa Pacifica** | Kayak Launch | No | Mission Bay, off E. Mission Bay Dr. |
| **Crown Cove** | Hand Launch | Yes | Coronado, Crown Cove Aquatic Center, San Diego Bay access via Silver Strand |

**Tier 2, real but each needs a call.**

| Name | Issue |
|---|---|
| **Agua Hedionda Lagoon**, Carlsbad | Protected lagoon, CCC describes "water-skiing, kayaking, birding". **CCC's `FEE=No` is WRONG**, see below. |
| **La Jolla Shores Beach Park** | The single most iconic kayak launch in San Diego, and genuinely open ocean. CCC's own description is "Swimming, surfing, diving". Needs a surf caveat if listed. |

**Tier 3, recommend excluding.**

| Name | Why |
|---|---|
| **Cardiff State Beach** | Typed `Hand Launch`, but CCC's own description is "Swimming, **surfing**, surf fishing". Open-ocean surf break, the Malibu class from the LA batch. |

## The finding that matters: CCC's fee field is wrong on the first candidate checked

**Agua Hedionda Lagoon: CCC says `FEE = No`. A Carlsbad city permit is REQUIRED to be on the water**, sold at roughly $9/day, plus a $10 launch fee if you launch from the California Watersports beach. There is a free public launch on Bayshore Drive that avoids the launch fee but **not** the permit.

This is exactly the failure the statewide inventory predicted for SoCal: **records fail by staleness and access rules, not by drifting from a good source.** CCC's lineage is a 2014 guidebook, and a permit regime introduced since is invisible to it. Shipping `has_fee: false` here would tell a paddler they can launch free when they would be on the water illegally.

**Consequence for the ingest: `FEE` cannot be carried from CCC unverified for San Diego.** In LA it was safe because the owner confirmed each one. Here it has already been caught lying once.

## The 11 boat ramps

Oceanside Harbor, Santa Clara Point, Dana Landing, Ski Beach, De Anza Cove, South Shores Park (all Mission Bay); Shelter Island, America's Cup Harbor, Glorietta Bay, Pepper Park, Chula Vista Launch Ramp (San Diego Bay).

All are protected water, which is in their favour. But **the owner already set a precedent in LA by excluding the Fiji Way ramp** ("I don't know, exclude this spot") on the grounds that a trailer ramp is not obviously a place a paddler is welcome. That precedent should decide these as a category rather than one at a time.

## Coordinate status

Worse than LA. Two of three Overpass boxes returned 504, and the Mission Bay box that did return shows **no slipway within 400 m of any paddle-specific candidate** (El Carmel Point 456 m, Playa Pacifica 1,322 m). That is consistent rather than alarming: a kayak launch on a bay beach has no slipway to map. **It does mean OSM cannot correct these coordinates, so they need eyes.**

---

# MANUAL LOOKUP LIST

## A. Blocking: put-in coordinate for the tier 1 and tier 2 sites

CCC's coordinate is a site locator, not a put-in, and OSM has nothing to match against here.

| Site | What I need |
|---|---|
| **El Carmel Point**, Mission Bay | Put-in coordinate. |
| **Playa Pacifica**, Mission Bay | Put-in coordinate. |
| **Crown Cove**, Coronado | Put-in coordinate. Also: is access public, or does it run through the Aquatic Center? CCC says entry is via Silver Strand State Beach, which implies a state-beach entry fee on top. |
| **Agua Hedionda Lagoon** | Which launch: the free public one on Bayshore Drive, or California Watersports' beach? They have different fees and probably different coordinates. |
| **La Jolla Shores** | Put-in coordinate, and your call on whether to list an open-ocean launch at all (see B2). |

## B. Blocking: judgment calls

1. **The 11 boat ramps: in or out, as a category?** Your Fiji Way exclusion suggests out. If you want a subset, Mission Bay's (Santa Clara Point, Ski Beach, De Anza Cove, South Shores) are the calmest water in the county.
2. **La Jolla Shores.** It is the standard San Diego kayak launch and it has real surf. Include with a surf caveat in the notes, or exclude on the same grounds as Cardiff and the Malibu beaches?
3. **Cardiff State Beach.** I recommend excluding. Confirm.

## C. Would otherwise be guessed

4. **Fees, for every San Diego record.** CCC has already been caught wrong once here. Do not let me carry `FEE` through unverified; tell me which of the shortlist actually charge, or I will store `null` rather than a value I cannot stand behind.
5. **`tide_sensitive`.** Mission Bay and San Diego Bay are tidal, so `true`. Agua Hedionda is a lagoon with tidal exchange through jetties, so probably `true`. Confirm if you know otherwise.
6. **The other 48** beach carry-in candidates are not listed here. Same reasoning as LA: mostly open-coast beach access, not put-ins. Name any you want and I will check them.


---

# METHOD UPGRADE, 2026-07-22: aerial imagery, after the owner asked "have you tried something more sophisticated"

**The honest answer was no, and the challenge was right.** What had been tried: the CCC API, DBW, Overpass restricted to `leisure=slipway` / `waterway=access_point` / `canoe=put_in`, Nominatim REVERSE geocoding, and web search. What had not: forward geocoding, wider OSM tags, and imagery.

## What was tried in response, and what each returned

| Method | Result |
|---|---|
| **Google Places API** | **Ruled out on licensing, not capability.** Google Maps Platform terms prohibit using Places content "with or near a non-Google map", and permit caching lat/lng for only **30 consecutive days**. This app renders Leaflet + CARTO tiles and stores coordinates permanently in `spots.json`, so both clauses are broken. Unusable unless the whole basemap moves to Google. |
| **Nominatim FORWARD search** (never previously run) | 3 of 5. All locators, not put-ins: Crown Cove returned a *boathouse building*, Agua Hedionda returned *a residential street*, La Jolla Shores returned a *beach polygon centroid*. El Carmel Point and Playa Pacifica returned **nothing**. |
| **Wider OSM tags** (`amenity=boat_rental`, named `natural=beach`) | **Zero features in Mission Bay.** The densest paddle water in California is essentially unmapped in OSM. A regex-over-all-names query blew the Overpass timeout. |
| **USGS aerial imagery** (`basemap.nationalmap.gov`, public domain) | **This works, and it is the method that should have been used first.** |

## Why imagery is the right tool here

Every dataset in this project publishes a *site locator*: the park, the address, the polygon centroid. A put-in is a physical feature you can see. In imagery the launch is directly visible: the ramp, the sand, the staged craft, the dock. It is also **licence-clean**: USGS National Map imagery is public domain, with no contract restriction of the kind that disqualifies Google.

It resolved things no dataset could:
- **El Carmel Point:** a cluster of small craft staged on the sand at the southeast shore of the point. That is the launch, and nothing in CCC, OSM or DBW says so.
- **Crown Cove:** unambiguous confirmation that it is protected. Ocean surf breaks on the Silver Strand side; the C-shaped cove sits on the bay side with the Aquatic Center at its south end.
- **Agua Hedionda:** shows **both** launches the permit research implied, and distinguishes them. The free public sand strip on the lagoon shore, and the concessionaire's craft area to the northwest.

## Proposed pins, for confirmation rather than lookup

Read off 900 px images spanning roughly 600 to 750 m, so about 0.7 m per pixel. The limiting error is my visual centroid estimate, roughly **±25 m**. Good enough to be a real put-in and worth a sanity check, not worth a survey.

| Site | Proposed | vs CCC's locator | Confidence |
|---|---|---|---|
| **El Carmel Point** | `32.7783, -117.2476` | ~60 m S | **High.** Staged craft visible on the sand. |
| **Crown Cove** | `32.6365, -117.1410` | ~75 m N | **High.** Cove geometry and the Aquatic Center are unmistakable. |
| **Agua Hedionda**, free public beach | `33.1421, -117.3210` | n/a, CCC pins the lagoon generally | **Medium-high.** Beach is clear; which access is "the" public one still benefits from local knowledge. |
| **Playa Pacifica** | `32.7819, -117.2107` | ~60 m N | **Medium.** The protected cove is obvious; the exact launch edge is not. |
| **La Jolla Shores** | not proposed | | Pending the owner's include/exclude call. |

## The lesson worth keeping

**Reach for imagery before asking a human to look something up.** The lookup list handed to the owner asked for five coordinates. Four of them were readable from public-domain aerial imagery in about a minute each, and the fifth is blocked on a product decision rather than a fact. The owner's remaining job shrinks from "find these" to "confirm or nudge these", which is a different and much smaller ask.
