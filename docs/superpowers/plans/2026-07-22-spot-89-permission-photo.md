# Spot 89 Permission Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace spot 89's image with Kaety Jensen's supplied photo and render the exact plain-text credit `Photo: Kaety Jensen`.

**Architecture:** Add `permission` as a distinct manifest provenance whose author is required but whose license and source URL are absent. Branch the existing drawer attribution UI so permission photos render a plain caption while Creative Commons, public-domain, and owner behavior remains unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, macOS `sips`, `jpegtran`, Playwright verification, Vercel.

---

### Task 1: Lock the permission-photo contract with failing tests

**Files:**
- Modify: `web/components/spot-photos.test.ts`

- [ ] **Step 1: Add the permission manifest and renderer assertions**

Add `license_url?: string | null` to the test manifest type. Change the two licensed-third-party loops to skip both `owner` and `permission`, then add:

```ts
it("permission photos carry a plain author credit without invented license metadata", () => {
  const photo = manifest.photos["89"];
  expect(photo).toMatchObject({
    file: "/spot-photos/89.jpg",
    source: "permission",
    author: "Kaety Jensen",
  });
  expect(photo.license).toBeUndefined();
  expect(photo.license_url).toBeUndefined();
  expect(photo.source_page).toBeUndefined();
});

it("permission photos render the exact plain-text credit", () => {
  expect(drawer).toContain('photo.source === "permission"');
  expect(drawer).toContain("Photo: {photo.author}");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `cd web && npm test -- components/spot-photos.test.ts`

Expected: FAIL because spot 89 still has Wikimedia metadata and `SpotDrawer.tsx` has no permission branch.

- [ ] **Step 3: Commit the red test**

```bash
git add web/components/spot-photos.test.ts
git commit -m "Test permission photo attribution"
```

### Task 2: Process the supplied image and update provenance

**Files:**
- Replace: `web/public/spot-photos/89.jpg`
- Modify: `web/data/spot-photos.json`
- Modify: `web/lib/spotPhotos.ts`

- [ ] **Step 1: Produce the deterministic 800-pixel-wide JPEG**

Run:

```bash
tmp_photo="$(mktemp /tmp/spot-89.XXXXXX.jpg)"
sips --resampleWidth 800 --setProperty format jpeg --setProperty formatOptions 85 /Users/qg/Downloads/89.jpg --out "$tmp_photo"
jpegtran -copy none -optimize -progressive -outfile web/public/spot-photos/89.jpg "$tmp_photo"
```

Expected: `web/public/spot-photos/89.jpg` is a progressive JPEG with proportional dimensions of 800 by 1067 pixels.

- [ ] **Step 2: Replace spot 89's manifest entry**

Use this exact entry in `web/data/spot-photos.json`:

```json
"89": {
  "file": "/spot-photos/89.jpg",
  "author": "Kaety Jensen",
  "source": "permission"
}
```

- [ ] **Step 3: Document the permission provenance in the shared type**

Update `web/lib/spotPhotos.ts` so the provenance comment includes permission-sourced photos and the field comments state that permission photos have an author but no license or source URL. Keep the interface fields optional so existing manifest entries remain valid.

- [ ] **Step 4: Verify the asset and manifest**

Run: `sips -g pixelWidth -g pixelHeight -g format web/public/spot-photos/89.jpg && jpegtran -verbose -copy none web/public/spot-photos/89.jpg >/dev/null`

Expected: width `800`, height `1067`, format `jpeg`, and no decode error.

- [ ] **Step 5: Commit the asset and provenance**

```bash
git add web/public/spot-photos/89.jpg web/data/spot-photos.json web/lib/spotPhotos.ts
git commit -m "Replace spot 89 photo"
```

### Task 3: Render the exact plain-text caption

**Files:**
- Modify: `web/components/SpotDrawer.tsx`
- Test: `web/components/spot-photos.test.ts`

- [ ] **Step 1: Add the permission-caption branch**

Replace the single attribution conditional with:

```tsx
{photo.source === "permission" && photo.author ? (
  <figcaption className="absolute inset-x-0 bottom-0 px-2 py-0.5 text-[10px] leading-tight text-white/85 bg-gradient-to-t from-black/55 to-transparent rounded-b-lg">
    Photo: {photo.author}
  </figcaption>
) : photo.author && photo.attribution_required !== false ? (
  <figcaption className="absolute inset-x-0 bottom-0 px-2 py-0.5 text-[10px] leading-tight text-white/85 bg-gradient-to-t from-black/55 to-transparent rounded-b-lg">
    <a href={photo.source_page} target="_blank" rel="noopener noreferrer" className="hover:underline">{photo.author}</a>
    {" / "}
    {photo.license_url ? (
      <a href={photo.license_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{photo.license}</a>
    ) : (
      photo.license
    )}
  </figcaption>
) : null}
```

Update the adjacent comment to describe the new plain-text permission caption without changing visible copy.

- [ ] **Step 2: Run the focused test and confirm it passes**

Run: `cd web && npm test -- components/spot-photos.test.ts`

Expected: PASS.

- [ ] **Step 3: Run static checks and the production build**

Run: `cd web && npm test && npm run lint && npm run build`

Expected: all tests pass, ESLint exits zero, and Next.js completes a production build.

- [ ] **Step 4: Commit the renderer**

```bash
git add web/components/SpotDrawer.tsx
git commit -m "Render permission photo credit"
```

### Task 4: Verify the rendered surface and deploy

**Files:**
- Verify: `web/public/spot-photos/89.jpg`
- Verify: `web/components/SpotDrawer.tsx`

- [ ] **Step 1: Start the local app**

Run: `cd web && npm run dev`

Expected: the Next.js development server reports a local URL without startup errors.

- [ ] **Step 2: Verify desktop and mobile spot 89 views**

Follow `.agents/skills/verify/SKILL.md` at 1280px desktop and 390px mobile. Open spot 89 and confirm the supplied shoreline photo is visible, object-cover remains proportional, the caption is exactly `Photo: Kaety Jensen`, and the caption contains no link.

- [ ] **Step 3: Deploy production**

Run: `vercel deploy --prod --yes --cwd web`

Expected: Vercel reports a successful production deployment URL.

- [ ] **Step 4: Verify production**

Open the live spot 89 surface at desktop and 390px mobile and repeat the local assertions. Confirm the image request returns HTTP 200 and the caption remains plain text.

- [ ] **Step 5: Record the verified deployment**

If the project tracks production with `deployed-prod`, move the tag to the deployed commit and push the branch and tag using the repository's established deployment workflow.

