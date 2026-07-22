import type { Spot, Difficulty } from "./types";
import { REGIONS, DIFFICULTY_LABEL } from "./types";

/**
 * Relevance-ranked spot search.
 *
 * Metric we optimize for (per query q):
 *   - Relevant set R(q): region query -> spots in that region; water-type query
 *     (the words shown on the filter: Flatwater / Open water / River) -> spots of that
 *     type; name/city query -> those spots; else -> spots whose text contains all
 *     query words.
 *   - Precision = |returned ∩ R| / |returned|, Recall = |returned ∩ R| / |R|.
 *
 * Two failure modes this replaces (flat substring-AND over name+city+region+notes):
 *   1. Low recall: "ocean" matched 4/60 spots because the type is labelled "Ocean"
 *      in the UI but that word lives almost nowhere in the data. Fixed by making the
 *      water-type label + synonyms a searchable field.
 *   2. Low precision: "south bay" leaked North/East Bay spots because "south" is a
 *      substring of "southern"/"southeast" and "bay" is everywhere in notes. Fixed
 *      by (a) word-prefix matching instead of raw substring and (b) region scoping:
 *      a query that names exactly one region restricts results to that region.
 */

// Search synonyms per water type. Anchored on the UI's own labels so a user can
// type what they see on the filter ("Lake", "Coast", "River"), and the PREVIOUS
// labels ("flatwater", "open water") are kept deliberately: someone who learned
// the old vocabulary, or followed an old link, must still find the same spots.
const TYPE_TERMS: Record<Difficulty, string[]> = {
  flatwater: ["flatwater", "flat", "calm", "lake", "lakes", "reservoir", "pond", "lagoon", "slough"],
  bay: ["coast", "coastal", "ocean", "bay", "sea", "saltwater", "tidal", "surf", "pacific", "open"],
  river: ["river", "creek", "rapids", "current", "whitewater"],
  unknown: [],
};

// Field weights: a hit in the name beats a hit in the notes.
const W = { name: 12, city: 8, region: 7, type: 6, tag: 5, place: 4, notes: 2 } as const;

// Synthetic search terms for the structured boolean amenity fields, so "dog",
// "rental", "tidal" etc. return spots flagged for those even when the notes
// never spell the word out. Includes morphological variants ("rent"/"rental")
// since matching is word-prefix, not stem-based.
// Every spot is a paddling put-in, so these craft/activity words match all of
// them. Lets "kayak rental" resolve to the rental flag instead of the 3 spots
// that happen to spell "kayak" in their notes.
const UNIVERSAL_TERMS = "kayak kayaking sup paddleboard paddleboarding paddle paddling canoe launch put-in boat";

function amenityTerms(s: Spot): string {
  const t: string[] = [UNIVERSAL_TERMS];
  if (s.dog_friendly) t.push("dog", "dogs", "dog-friendly", "pet", "pets");
  if (s.rentals_available) t.push("rental", "rentals", "rent", "rents");
  if (s.tide_sensitive) t.push("tidal", "tide", "tides");
  if (s.power_boats) t.push("powerboat", "powerboats", "motorboat", "motorboats");
  if (s.inspection_required) t.push("inspection", "inspections", "permit");
  return t.join(" ");
}

// Lowercase, strip punctuation to spaces, collapse whitespace.
function norm(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// A query token matches a normalized field if any word in the field starts with
// it (autocomplete-style prefix). "marin" -> "marina", but matching is anchored at
// word starts so it never matches mid-word.
function fieldHas(fieldText: string, token: string): boolean {
  if (!token) return false;
  return fieldText === token
    || fieldText.startsWith(token + " ")
    || fieldText.includes(" " + token);
}

function buildFields(s: Spot) {
  return {
    name: norm(s.water),
    city: norm(s.city ?? ""),
    region: norm(s.region),
    type: norm(`${DIFFICULTY_LABEL[s.difficulty] ?? ""} ${TYPE_TERMS[s.difficulty]?.join(" ") ?? ""}`),
    tag: norm(amenityTerms(s)),
    place: norm(s.geocode_display ?? ""),
    notes: norm(s.notes ?? ""),
  };
}

function bestWeight(f: ReturnType<typeof buildFields>, token: string): number {
  if (fieldHas(f.name, token)) return W.name;
  if (fieldHas(f.city, token)) return W.city;
  if (fieldHas(f.region, token)) return W.region;
  // Short tokens (1-2 chars) only match the spot/city/region name. A 2-char prefix
  // like "Co" otherwise hits ubiquitous words in the geocode string ("County") and
  // the notes (Cove, Coast, conditions…) and returns ~all spots, which reads as a
  // broken search. The fuller fields kick in once the query is specific enough.
  if (token.length < 3) return 0;
  if (fieldHas(f.place, token)) return W.place;
  if (fieldHas(f.type, token)) return W.type;
  if (fieldHas(f.tag, token)) return W.tag;
  if (fieldHas(f.notes, token)) return W.notes;
  return 0;
}

const REGION_WORDS: { region: string; words: string[] }[] = REGIONS.map((r) => ({
  region: r,
  words: norm(r).split(" "),
}));

/**
 * If the query fully names exactly one region, return that region plus the
 * leftover tokens (so "south bay marina" scopes to South Bay then filters by
 * "marina"). Ambiguous prefixes like "bay" or "central" do not scope.
 */
function regionScope(queryWords: string[]): { region: string; rest: string[] } | null {
  const hits = REGION_WORDS.filter((r) => r.words.every((w) => queryWords.includes(w)));
  if (hits.length !== 1) return null;
  const { region, words } = hits[0];
  return { region, rest: queryWords.filter((w) => !words.includes(w)) };
}

/** Filter + relevance-rank spots for a free-text query. Returns highest-relevance first. */
export function searchSpots(spots: Spot[], rawQuery: string): Spot[] {
  const q = norm(rawQuery);
  if (!q) return spots;
  const queryWords = q.split(" ");

  const scope = regionScope(queryWords);
  const candidates = scope ? spots.filter((s) => s.region === scope.region) : spots;
  const tokens = scope ? scope.rest : queryWords;

  const scored: { spot: Spot; score: number }[] = [];
  for (const spot of candidates) {
    const f = buildFields(spot);
    let score = scope ? 1000 : 0; // a named-region match outranks any free-text hit
    let ok = true;
    for (const t of tokens) {
      const w = bestWeight(f, t);
      if (w === 0) { ok = false; break; }
      score += w;
    }
    if (!ok) continue;
    // Phrase bonus: contiguous match of the non-region terms in name/city ranks
    // exact places (e.g. "foster city") above incidental token hits.
    const phrase = tokens.join(" ");
    if (phrase) {
      if (f.name.includes(phrase)) score += W.name * 2;
      else if (f.city.includes(phrase)) score += W.city * 2;
    }
    scored.push({ spot, score });
  }

  scored.sort((a, b) => b.score - a.score || a.spot.water.localeCompare(b.spot.water));
  return scored.map((x) => x.spot);
}
