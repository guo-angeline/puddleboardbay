# Retention Hook — Stage A: "Your Spots by Conditions" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give saved spots a payoff by showing each one's live paddle-ability and ranking the user's saved list calm-first, so checking "my spots" becomes a daily habit. Ships with zero backend.

**Architecture:** Reuse the existing client-side `getConditions()` (cached + deduped per spot) to fetch wind for each saved spot, reduce it to a `Paddleability` per spot, then sort the existing "Your saved spots" section in `SpotList` calm-first and render a conditions badge on each. Pure ranking/fetch logic lives in `lib/savedConditions.ts` (unit-tested with Vitest); a thin React hook and a presentational badge wire it into the UI.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19.2.4, TypeScript 5, Tailwind v4, Vitest (new, for pure-logic unit tests), Playwright (existing, manual smoke).

## Global Constraints

- App is **fully static, no backend**. Stage A adds **no** server code, API routes, or new runtime dependencies beyond a dev-only test runner.
- Next.js **16.2.6**, React **19.2.4** (do not change versions).
- **No em dashes** in any user-facing copy. Use commas, colons, or periods.
- Reuse `getConditions(spotId, lat, lng, tideSensitive, signal?)` from `lib/conditions.ts`. It is cached per spot id (30-min TTL) and dedupes concurrent calls. **Never** call NOAA/NWS directly or fetch on every render.
- Paddle-ability values are the existing union `"calm" | "breezy" | "windy" | "unknown"` from `lib/conditions.ts`. Do not invent new ones.
- Paddle-ability badge colors must match the existing `PADDLE_COPY` hexes in `components/ConditionsPanel.tsx` (calm `#ECFDF5`/`#065F46`, breezy `#FEFCE8`/`#854D0E`, windy `#FEF2F2`/`#991B1B`, neutral `#F5F5F4`/`#78716C`).
- Analytics: any new event name must be added to the `EventName` union in `lib/analytics.ts` before `track()` is called with it (the union is the allowlist, unknown names fail to compile). Include `spot`-related props where a spot is involved.
- Import alias is `@/` (maps to repo root).

---

## File Structure

- `lib/savedConditions.ts` (new) — pure logic: rank ordering + a getter-injected batch fetch. No React, no direct network.
- `lib/savedConditions.test.ts` (new) — Vitest unit tests for the pure logic.
- `components/useSavedConditions.ts` (new) — thin React hook wrapping the batch fetch with loading state.
- `components/ConditionsBadge.tsx` (new) — presentational paddle-ability pill (calm/breezy/windy/loading).
- `components/SpotCard.tsx` (modify) — add an optional `conditionsBadge` slot rendered under the title.
- `components/SpotList.tsx` (modify) — order the "Your saved spots" section calm-first and pass a badge to each saved card.
- `components/HomeClient.tsx` (modify) — call the hook, pass `condBySpot` to `SpotList`, fire the analytics event.
- `lib/analytics.ts` (modify) — add `saved_conditions_viewed` to the `EventName` union.
- `vitest.config.ts` (new) + `package.json` (modify) — test runner.

---

## Task 1: Test runner + pure ranking logic

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest` devDep + `test` script)
- Create: `lib/savedConditions.ts`
- Test: `lib/savedConditions.test.ts`

**Interfaces:**
- Produces:
  - `type SavedConditionState = Paddleability | "loading"`
  - `paddleabilityRank(state: SavedConditionState): number` — calm `0`, breezy `1`, windy `2`, unknown `3`, loading `4`.
  - `rankSavedSpotsByConditions(spots: Spot[], condBySpot: Record<number, SavedConditionState>): Spot[]` — returns a new array sorted ascending by rank; ties keep input order (stable). A spot id missing from `condBySpot` is treated as `"loading"`.

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm install -D vitest@^2
```
Expected: `vitest` appears under `devDependencies` in `package.json`, install exits 0.

- [ ] **Step 2: Add the test script**

Modify `package.json` `scripts` so it reads:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `lib/savedConditions.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import type { Spot } from "@/lib/types";
import { paddleabilityRank, rankSavedSpotsByConditions } from "@/lib/savedConditions";

function spot(id: number, water: string): Spot {
  // Only the fields the ranking touches need to be real; cast the rest.
  return { id, water } as Spot;
}

describe("paddleabilityRank", () => {
  it("orders calm < breezy < windy < unknown < loading", () => {
    expect(paddleabilityRank("calm")).toBeLessThan(paddleabilityRank("breezy"));
    expect(paddleabilityRank("breezy")).toBeLessThan(paddleabilityRank("windy"));
    expect(paddleabilityRank("windy")).toBeLessThan(paddleabilityRank("unknown"));
    expect(paddleabilityRank("unknown")).toBeLessThan(paddleabilityRank("loading"));
  });
});

describe("rankSavedSpotsByConditions", () => {
  it("sorts calm-first and keeps input order within a tie", () => {
    const spots = [spot(1, "A"), spot(2, "B"), spot(3, "C"), spot(4, "D")];
    const condBySpot = { 1: "windy", 2: "calm", 3: "calm", 4: "breezy" } as const;
    const ranked = rankSavedSpotsByConditions(spots, condBySpot);
    expect(ranked.map((s) => s.id)).toEqual([2, 3, 4, 1]);
  });

  it("treats a missing spot id as loading and sinks it to the bottom", () => {
    const spots = [spot(1, "A"), spot(2, "B")];
    const condBySpot = { 2: "calm" } as Record<number, "calm">;
    const ranked = rankSavedSpotsByConditions(spots, condBySpot);
    expect(ranked.map((s) => s.id)).toEqual([2, 1]);
  });

  it("does not mutate the input array", () => {
    const spots = [spot(1, "A"), spot(2, "B")];
    const condBySpot = { 1: "windy", 2: "calm" } as const;
    rankSavedSpotsByConditions(spots, condBySpot);
    expect(spots.map((s) => s.id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run:
```bash
npm test -- lib/savedConditions.test.ts
```
Expected: FAIL, cannot resolve `@/lib/savedConditions` (module not yet created).

- [ ] **Step 6: Implement the pure logic**

Create `lib/savedConditions.ts`:
```ts
import type { Spot } from "@/lib/types";
import type { Paddleability } from "@/lib/conditions";

/** UI state for a saved spot's conditions: a resolved read, or still loading. */
export type SavedConditionState = Paddleability | "loading";

const RANK: Record<SavedConditionState, number> = {
  calm: 0,
  breezy: 1,
  windy: 2,
  unknown: 3,
  loading: 4,
};

export function paddleabilityRank(state: SavedConditionState): number {
  return RANK[state];
}

/**
 * Sort saved spots calm-first for the "Your Spots" section. Returns a new array
 * (never mutates the input). Ties preserve input order because Array.sort is
 * stable. A spot id absent from condBySpot is still loading, so it sinks last.
 */
export function rankSavedSpotsByConditions(
  spots: Spot[],
  condBySpot: Record<number, SavedConditionState>
): Spot[] {
  return [...spots].sort(
    (a, b) =>
      paddleabilityRank(condBySpot[a.id] ?? "loading") -
      paddleabilityRank(condBySpot[b.id] ?? "loading")
  );
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run:
```bash
npm test -- lib/savedConditions.test.ts
```
Expected: PASS, 4 tests green.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/savedConditions.ts lib/savedConditions.test.ts
git commit -m "Add Vitest + saved-spot conditions ranking logic"
```

---

## Task 2: Batch conditions fetch (getter-injected, testable)

**Files:**
- Modify: `lib/savedConditions.ts`
- Test: `lib/savedConditions.test.ts`

**Interfaces:**
- Consumes: `getConditions` from `lib/conditions.ts` with signature `(spotId: number, lat: number, lng: number, tideSensitive: boolean, signal?: AbortSignal) => Promise<Conditions>`.
- Produces:
  - `type ConditionsGetter = (spotId: number, lat: number, lng: number, tideSensitive: boolean) => Promise<Conditions>`
  - `fetchSavedConditions(spots: Spot[], get: ConditionsGetter): Promise<Record<number, Paddleability>>` — resolves a map of spot id to paddle-ability. A spot whose fetch rejects, or whose wind is absent, maps to `"unknown"`. Never rejects.

- [ ] **Step 1: Write the failing test**

Append to `lib/savedConditions.test.ts`:
```ts
import { fetchSavedConditions } from "@/lib/savedConditions";
import type { Conditions } from "@/lib/conditions";

function conditions(paddleability: "calm" | "breezy" | "windy" | null): Conditions {
  return {
    tide: null,
    wind: paddleability
      ? { speedMin: 0, speedMax: 5, direction: "W", shortForecast: "x", periodName: "Today", paddleability }
      : null,
    failed: paddleability === null,
    fetchedAt: 0,
  };
}

describe("fetchSavedConditions", () => {
  it("maps each spot id to its paddleability", async () => {
    const spots = [
      { id: 1, lat: 1, lng: 1, tide_sensitive: false } as Spot,
      { id: 2, lat: 2, lng: 2, tide_sensitive: true } as Spot,
    ];
    const get = async (id: number) => conditions(id === 1 ? "calm" : "windy");
    const map = await fetchSavedConditions(spots, get);
    expect(map).toEqual({ 1: "calm", 2: "windy" });
  });

  it("falls back to unknown when wind is missing", async () => {
    const spots = [{ id: 7, lat: 0, lng: 0, tide_sensitive: false } as Spot];
    const get = async () => conditions(null);
    expect(await fetchSavedConditions(spots, get)).toEqual({ 7: "unknown" });
  });

  it("falls back to unknown when a fetch rejects, without failing the batch", async () => {
    const spots = [
      { id: 1, lat: 0, lng: 0, tide_sensitive: false } as Spot,
      { id: 2, lat: 0, lng: 0, tide_sensitive: false } as Spot,
    ];
    const get = async (id: number) => {
      if (id === 1) throw new Error("network");
      return conditions("calm");
    };
    expect(await fetchSavedConditions(spots, get)).toEqual({ 1: "unknown", 2: "calm" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm test -- lib/savedConditions.test.ts
```
Expected: FAIL, `fetchSavedConditions` is not exported.

- [ ] **Step 3: Implement the batch fetch**

Append to `lib/savedConditions.ts`:
```ts
import type { Conditions, Paddleability } from "@/lib/conditions";

export type ConditionsGetter = (
  spotId: number,
  lat: number,
  lng: number,
  tideSensitive: boolean
) => Promise<Conditions>;

/**
 * Fetch paddle-ability for every saved spot, in parallel. The getter is injected
 * so tests can run without the network; production passes lib/conditions
 * getConditions, which caches + dedupes per spot id. Resolves to a complete map;
 * any failure or missing wind degrades that spot to "unknown" rather than
 * rejecting the whole batch.
 */
export async function fetchSavedConditions(
  spots: Spot[],
  get: ConditionsGetter
): Promise<Record<number, Paddleability>> {
  const entries = await Promise.all(
    spots.map(async (s): Promise<[number, Paddleability]> => {
      try {
        const c = await get(s.id, s.lat, s.lng, s.tide_sensitive);
        return [s.id, c.wind?.paddleability ?? "unknown"];
      } catch {
        return [s.id, "unknown"];
      }
    })
  );
  return Object.fromEntries(entries);
}
```
Note: merge the `import type { Conditions, Paddleability }` line into the existing `lib/conditions` type import at the top of the file rather than duplicating it.

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm test -- lib/savedConditions.test.ts
```
Expected: PASS, all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/savedConditions.ts lib/savedConditions.test.ts
git commit -m "Add getter-injected batch conditions fetch for saved spots"
```

---

## Task 3: Conditions badge + React hook

**Files:**
- Create: `components/ConditionsBadge.tsx`
- Create: `components/useSavedConditions.ts`

**Interfaces:**
- Consumes: `fetchSavedConditions`, `SavedConditionState` from `lib/savedConditions.ts`; `getConditions` from `lib/conditions.ts`.
- Produces:
  - `ConditionsBadge` default export, props `{ state: SavedConditionState }`.
  - `useSavedConditions(savedSpots: Spot[]): { condBySpot: Record<number, Paddleability>; loading: boolean }` — fetches when the set of saved spot ids changes; returns an empty map while first loading.

- [ ] **Step 1: Create the badge component**

Create `components/ConditionsBadge.tsx`:
```tsx
import type { SavedConditionState } from "@/lib/savedConditions";

// Colors mirror PADDLE_COPY in ConditionsPanel.tsx so the two reads agree.
const STYLE: Record<SavedConditionState, { label: string; bg: string; text: string }> = {
  calm:    { label: "Calm",    bg: "#ECFDF5", text: "#065F46" },
  breezy:  { label: "Breezy",  bg: "#FEFCE8", text: "#854D0E" },
  windy:   { label: "Windy",   bg: "#FEF2F2", text: "#991B1B" },
  unknown: { label: "No data", bg: "#F5F5F4", text: "#78716C" },
  loading: { label: "…",       bg: "#F5F5F4", text: "#78716C" },
};

export default function ConditionsBadge({ state }: { state: SavedConditionState }) {
  const s = STYLE[state];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.text }}
      aria-label={state === "loading" ? "Loading conditions" : `Conditions: ${s.label}`}
    >
      {s.label}
    </span>
  );
}
```

- [ ] **Step 2: Create the hook**

Create `components/useSavedConditions.ts`:
```ts
"use client";

import { useEffect, useState } from "react";
import type { Spot } from "@/lib/types";
import type { Paddleability } from "@/lib/conditions";
import { getConditions } from "@/lib/conditions";
import { fetchSavedConditions } from "@/lib/savedConditions";

/**
 * Resolve paddle-ability for the user's saved spots. Refetches only when the
 * set of saved ids changes (joined-id key), not on every render. getConditions
 * is cached + deduped per spot id, so re-running is cheap.
 */
export function useSavedConditions(savedSpots: Spot[]): {
  condBySpot: Record<number, Paddleability>;
  loading: boolean;
} {
  const [condBySpot, setCondBySpot] = useState<Record<number, Paddleability>>({});
  const [loading, setLoading] = useState(false);
  const idsKey = savedSpots.map((s) => s.id).sort((a, b) => a - b).join(",");

  useEffect(() => {
    if (savedSpots.length === 0) {
      setCondBySpot({});
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchSavedConditions(savedSpots, getConditions).then((map) => {
      if (!alive) return;
      setCondBySpot(map);
      setLoading(false);
    });
    return () => { alive = false; };
  // idsKey captures the only input that should retrigger the fetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return { condBySpot, loading };
}
```

- [ ] **Step 3: Verify it typechecks and builds**

Run:
```bash
npm run lint && npm run build
```
Expected: lint clean, build succeeds (`✓ Compiled`). No new files are imported yet, so this only proves they compile.

- [ ] **Step 4: Commit**

```bash
git add components/ConditionsBadge.tsx components/useSavedConditions.ts
git commit -m "Add conditions badge component and saved-conditions hook"
```

---

## Task 4: Wire conditions into the saved-spots section + analytics

**Files:**
- Modify: `lib/analytics.ts` (add event name)
- Modify: `components/SpotCard.tsx` (badge slot)
- Modify: `components/SpotList.tsx` (rank + badge in saved section)
- Modify: `components/HomeClient.tsx` (hook + pass props + analytics)

**Interfaces:**
- Consumes: `useSavedConditions` (Task 3), `rankSavedSpotsByConditions` + `SavedConditionState` (Task 1), `ConditionsBadge` (Task 3).
- Produces: `SpotList` accepts a new optional prop `condBySpot?: Record<number, SavedConditionState>`. `SpotCard` accepts a new optional prop `conditionsBadge?: React.ReactNode`.

- [ ] **Step 1: Add the analytics event name**

In `lib/analytics.ts`, add to the `EventName` union (place it after `favorite_toggled`):
```ts
  | "favorite_toggled"
  // Saved-spot conditions surfaced in the "Your Spots" list. Fired once per
  // session after the first batch resolves, to measure whether ranking saved
  // spots by paddle-ability is what brings people back.
  | "saved_conditions_viewed"
```

- [ ] **Step 2: Add a badge slot to SpotCard**

In `components/SpotCard.tsx`, add the prop and render it under the title. Change the `Props` interface to include:
```tsx
  conditionsBadge?: React.ReactNode;
```
Update the destructure on the `SpotCard` function to include `conditionsBadge`, and render it directly under the city/region line (inside the `flex-1 min-w-0` div, after the `<p>` with `spot.city`):
```tsx
          {conditionsBadge && <div className="mt-1.5">{conditionsBadge}</div>}
```

- [ ] **Step 3: Rank + badge the saved section in SpotList**

In `components/SpotList.tsx`:

Add imports at the top:
```tsx
import { rankSavedSpotsByConditions, type SavedConditionState } from "@/lib/savedConditions";
import ConditionsBadge from "./ConditionsBadge";
```
Add `condBySpot` to the `Props` interface:
```tsx
  condBySpot?: Record<number, SavedConditionState>;
```
Add it to the destructure with a default:
```tsx
  savedSpots = [], favorites = new Set(), onToggleFavorite, condBySpot = {},
```
Replace the saved-spots `.map` (currently `savedSpots.map((spot) => (`) so it iterates the ranked order and passes a badge. The block becomes:
```tsx
          {rankSavedSpotsByConditions(savedSpots, condBySpot).map((spot) => (
            <div key={spot.id} ref={selected?.id === spot.id ? selectedRef : null}>
              <SpotCard
                spot={spot}
                selected={selected?.id === spot.id}
                onClick={() => onSelect(spot)}
                distance={distanceMap?.[spot.id]}
                isFavorite={true}
                onToggleFavorite={onToggleFavorite}
                conditionsBadge={<ConditionsBadge state={condBySpot[spot.id] ?? "loading"} />}
              />
            </div>
          ))}
```

- [ ] **Step 4: Wire the hook and analytics in HomeClient**

In `components/HomeClient.tsx`:

Add imports:
```tsx
import { useRef } from "react";
import { useSavedConditions } from "@/components/useSavedConditions";
```
(Merge `useRef` into the existing `react` import rather than duplicating it.)

After the existing `savedSpots` useMemo (around line 159), add:
```tsx
  const { condBySpot, loading: conditionsLoading } = useSavedConditions(savedSpots);

  // Fire once per session, after the first saved-conditions batch resolves.
  const loggedSavedConditions = useRef(false);
  useEffect(() => {
    if (loggedSavedConditions.current) return;
    if (savedSpots.length === 0 || conditionsLoading) return;
    loggedSavedConditions.current = true;
    const calm = Object.values(condBySpot).filter((p) => p === "calm").length;
    track("saved_conditions_viewed", { count: savedSpots.length, calm_count: calm });
  }, [savedSpots.length, conditionsLoading, condBySpot]);
```
Pass `condBySpot` into the `SpotList` element (add the prop alongside the existing ones at the `<SpotList ... />` call around line 361):
```tsx
            condBySpot={condBySpot}
```

- [ ] **Step 5: Verify lint, types, build, and unit tests**

Run:
```bash
npm run lint && npm test && npm run build
```
Expected: lint clean, all Vitest tests pass, build succeeds.

- [ ] **Step 6: Manual smoke test in a real browser**

Run:
```bash
npm run dev
```
Then in the browser at `http://localhost:3000`:
1. Save 2 to 3 spots with the heart control.
2. Confirm the "Your saved spots" section shows a conditions badge on each card (it shows "…" briefly, then Calm/Breezy/Windy/No data).
3. Confirm the saved spots reorder calm-first once conditions load.
4. Open DevTools, Network tab, and confirm only one request per unique spot to `api.weather.gov` (the cache/dedupe is working, no per-render refetch).
5. In the PostHog debugger or the Network tab, confirm a single `saved_conditions_viewed` event fires after the badges resolve, with `count` and `calm_count`.

Expected: all five hold. If badges never leave "…", check that `getConditions` is being passed (not called) into `fetchSavedConditions`.

- [ ] **Step 7: Confirm the event lands in the bundle**

Run:
```bash
grep -rho "saved_conditions_viewed" .next/static | head -1
```
Expected: prints `saved_conditions_viewed` (per the CLAUDE.md analytics check).

- [ ] **Step 8: Commit**

```bash
git add lib/analytics.ts components/SpotCard.tsx components/SpotList.tsx components/HomeClient.tsx
git commit -m "Rank saved spots by live conditions and badge them (Stage A)"
```

---

## Self-Review

**Spec coverage (Stage A scope only):**
- "Your Spots, ranked by today's conditions" → Tasks 1 to 4 (rank in Task 1, fetch in Task 2, badge/hook in Task 3, wiring in Task 4). ✓
- Repurpose favorites as watched spots → reuses existing favorites/`savedSpots`; no schema change needed for Stage A. ✓
- Reuse `lib/conditions` `paddleability`, cached + deduped → Task 2 getter is `getConditions`; Task 4 Step 6 verifies one request per spot. ✓
- Empty state nudges first save → already present in `SpotList` (the "Tap ♥ to save" line), unchanged. ✓
- Analytics for material UX change → `saved_conditions_viewed` added to the union (Task 4 Step 1) and fired (Step 4), bundle-checked (Step 7). ✓
- Works with zero backend → no server code added; all logic client-side. ✓

**Out of scope (later stages, intentionally not here):** push subscription, install overhaul, Supabase tables, cron watcher, the `spot_watched` / `alert_*` events. Those get their own plans (Stages B, C, D).

**Placeholder scan:** no TBD/TODO; every code step shows complete code; every command has expected output. ✓

**Type consistency:** `SavedConditionState` defined in Task 1 and reused in Tasks 3 and 4; `condBySpot` typed `Record<number, SavedConditionState>` in `SpotList` (Task 4) while the hook returns `Record<number, Paddleability>` (a subset, since loading is only applied via the `?? "loading"` fallback at the badge call site, so the prop accepts the wider type and the narrower value assigns cleanly). `fetchSavedConditions` getter signature matches `getConditions` minus the optional `signal`. `ConditionsBadge` prop `state: SavedConditionState` matches its call site. ✓
