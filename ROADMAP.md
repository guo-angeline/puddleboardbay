# Roadmap

Deferred features, kept implementation-ready. When picking one up, build it, then delete its entry from this file.

## C. Text search (wildlife, names, notes)

**Why:** Users want to find spots by what's there, not just by region/difficulty. The motivating request: search for commonly-seen wildlife ("sea otters" in Santa Cruz / Monterey). Searching the spot descriptions covers this and more (place names, features like "kayak launch", "tidal").

**Scope:** A free-text box that filters spots by matching their text fields. Client-side only, no backend (consistent with the static-app architecture).

**Implementation plan:**

1. **`components/FilterBar.tsx`**
   - Add `search: string` to the `Filters` interface.
   - Add `search: ""` to `EMPTY_FILTERS`.
   - Include `search` in `hasActiveFilters` (non-empty string counts as active, so "Clear all" appears).
   - Render a search `<input>` at the top of the bar (above the region row). Controlled value `filters.search`, `onChange` calls `onChange({ ...filters, search: e.target.value })`. Placeholder e.g. `Search spots, e.g. "otters", "tidal"`. Add a small clear (✕) affordance when non-empty.

2. **`components/HomeClient.tsx`**
   - Extend `applyFilters` to match `search` case-insensitively against `notes`, `water`, `city`, and `region` (guard nulls). Match should be a substring `includes` on a lowercased concatenation. Tokenize on whitespace so "sea otter" matches notes containing "sea otters".
   - Initialize `filters` state with `search: ""`.
   - Add `search: ""` to the reset in `handleClearAll`.

3. **Analytics** (`handleFilterChange` already fires `filter_changed`)
   - Add `search_query: f.search || null` (or just a boolean `has_search`) to the `filter_changed` event. Avoid logging raw query if PII-sensitive; a length/boolean is enough for funnel analysis.
   - Optional persona signal: users who search are exploration-driven.

4. **Wildlife data enrichment** (pairs with this feature, do it together)
   - Seed accurate, evergreen wildlife mentions into coastal/estuary spot `notes` so search has something to find: sea otters and sea lions (Santa Cruz, Monterey-area, Elkhorn Slough), harbor seals, shorebirds/waterfowl (South Bay sloughs, Suisun marsh), etc. Only add wildlife that's genuinely common at each spot. The new Santa Cruz Harbor spot (id 123) already mentions sea otters and sea lions.

**Notes / decisions:**
- Keep it a pure substring filter first. Fuzzy matching / synonyms (otter → wildlife) is a later refinement, not v1.
- Debouncing isn't needed: data is 118 spots in memory, filtering is instant.
- Empty search = no filtering (return all), so it composes with the existing region/difficulty/free/near-me filters via the same `applyFilters` pipeline.
