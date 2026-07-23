# Lake Tahoe Water Trail: classification and ingest recommendation (item 88, 2026-07-22)

**Question item 88 asks:** is the Lake Tahoe Water Trail a field-complete registry like the SF Bay Water Trail (which is what made the item-40/45 rigor possible), how large is the coverage gap, and should we ingest it?

**Method:** the item's prescribed order, classify first, add nothing yet. Sources: `laketahoewatertrail.org` day-trips + trailheads pages, cross-referenced against our 14 Sierra Nevada records, plus USGS aerial imagery for the one pin lead.

## Headline

**Yes, the LTWT is the same structural thing as the Bay Water Trail: a designated shoreline route publishing per-site launch/landing data with restrooms, parking and segment maps.** That validates item 45's premise that a field-complete Sierra registry exists. But its site coordinates are published only through **seven per-segment Google My Maps embeds** (Tahoe City, North Shore, Sand Harbor, Cave Rock, South Shore, Emerald Bay, West Shore) and the printed waterproof guide, not as scrapeable HTML, which is the exact "authoritative source, locked in a JS map" situation the Bay trail also presented. So this pass classifies the **13 launch/landing sites nameable from the accessible pages**; the remaining ~24 of the stated 37 need the segment maps or the guide pulled, which is its own effort.

## Classification of the 13 sites nameable so far

Our Tahoe-shoreline records: #11 Sand Harbor, #15 Waterman's Landing, #103 Kings Beach. (#14 Fallen Leaf Lake is a **separate lake** ~1 mi south of the south shore, not an LTWT shoreline site, so it is off-trail, not a match.)

| LTWT site | Shore | Status | Note |
|---|---|---|---|
| Sand Harbor | East | **CARRIED** (#11) | Pin verified, see below. |
| Waterman's Landing | North | **CARRIED** (#15) | |
| Kings Beach | North | **CARRIED** (#103) | |
| Commons Beach | North (Tahoe City) | **GAP** | Named public trailhead. |
| Lake Forest (Barton Creek outfall) | North | **GAP** | |
| Tahoe Vista | North | **GAP** | |
| Carnelian Bay | North | **GAP** | |
| Cave Rock Boat Launch | East | **GAP** | The OSM sweep also flagged this as a named Tahoe candidate. |
| Zephyr Cove | East | **GAP** | |
| Camp Richardson | South | **GAP** | |
| Kaspian Beach | West | **GAP** | |
| Sugar Pine Point State Park | West | **GAP** | TART-bus accessible. |
| Meeks Bay | West | **GAP** | |

**Counts (partial, 13 of 37):** 3 CARRIED, 10 GENUINE GAP, 0 MERGED, plus ~24 sites not yet extracted from the segment maps. The gap is real and large: even on this partial list we carry 3 of 13, and the region has 14 Sierra records total against 37 published Tahoe sites. This is NOT mostly-MERGED (which would have made it item-40 dedup work); it is genuine new coverage.

## The Sand Harbor pin lead: RESOLVED, no change

The 2026-07-22 OSM sweep flagged a slipway named "Sand harbor" (`node/4320621468`) **582 m north** of our spot 11 pin, the same offset fingerprint as the parking-vs-dock errors at spots 127/130/132. Checked against USGS imagery:

- **Our spot 11 pin (39.1956, -119.9289) sits on the Sand Harbor swimming beach** (broad sand, swimmers in the water). That is a real carry-in put-in.
- **The OSM slipway 582 m north (39.2007, -119.9305) is a different facility:** the Sand Harbor State Park **boat-launch ramp** with a large trailer parking lot and a pier.

So this is NOT the parking-vs-dock error. They are two distinct real launches serving different craft, and for a SUP/kayak the beach (our pin) is the better one; the ramp is for trailered motorboats. **Our coordinate is correct for the app's use case. No coordinate change (which would gate under D19/D23 anyway).** The general lesson holds: a distance-offset OSM match is a lead to verify, not a correction to apply.

## Per-field cautions when these are ingested (from the item + the source)

- `tide_sensitive: false` from the source. Tahoe is a lake; the flag is meaningless here and must be set false explicitly, never inferred.
- **TRPA requires an aquatic-invasive-species inspection before launching**, already reflected in #102/#103. `inspection_required` will be `true` broadly, but it varies by site (motorized vs non-motorized, and some beaches are carry-in exempt), so it is per-site, not a blanket.
- `has_fee`, `rentals_available` are real and commonly wrong; take them per site from the trailhead data, not by inference.
- Coordinates are the put-in, verified against a second source (the segment map's own pin plus imagery), per the Sand Harbor method above. The Water Trail may publish the parking; assume so until imagery proves the pin is on water.

## Recommendation on ingest: DEFER, and here is the honest weighing

- **For:** the source is field-complete and the gap is large and genuine (~30 real new sites). It proves the item-45 statewide method works for the Sierra, not just the Bay.
- **Against, and it is the deciding factor:** Tahoe is a 2 to 4 hour drive from the Bay Area, where essentially all current traffic is. These records serve *trip planning*, not the daily-decision use the conditions loop is built around. 30 new records is roughly 4 to 8 imagery-verified ingest passes (the SoCal batches ran 6 to 16 sites each), for a region the current user base rarely reaches.
- **So:** do not fund the full 37-site ingest now. It is the right work when statewide coverage or a trip-planner (item 93) is the active priority, not while retention for Bay Area daily users is the #1 goal. The classification here is the cheap, high-information half; it is done and it says the source is good and the gap is real. The expensive half should wait for a reason to reach Tahoe users.

**If the owner wants a subset now:** the North Shore cluster (Commons Beach, Lake Forest, Tahoe Vista, Carnelian Bay) is contiguous with our existing #15/#103 and is the densest, most-visited shore, so it would be the highest-value narrow ingest.
