## Goal
Align both horizontal rails — **Captured images** (left card) and **AI suggested matches** (right card) — to the design language in the reference: chevron paginators on the outer edges, generous consistent spacing between thumbnails, rounded thumbnails with a clean cyan ring on the active item.

## Reference design tokens (from upload)
- Outer chevrons: left + right, vertically centered, no background, white/E0E0E0 stroke, simple `<` `>`.
- Rail padding: ~16px horizontal so first/last thumbnail clears the chevrons.
- Gap between thumbnails: ~16px (vs current 8px).
- Thumbnail: rounded `rounded-lg` (~10px), 2px border, dark background. Active = 2px solid `#3BB6E9` (no double ring/offset). Inactive = transparent/neutral border.
- Status badges (approved ✓ / rejected ✕) stay top-right; in inactive state they remain visible.
- Container has no inner divider — clean dark surface.

## Changes

### 1. Shared `ThumbRail` wrapper (inline within `ReviewSession.tsx`)
A small helper used by both rails:
- Flex row: `[Chevron] [scroll viewport flex-1] [Chevron]`
- Chevron buttons: 32×32, `text-[#E0E0E0]`, hover `bg-white/[0.04]`, disabled at scroll edges.
- Scroll viewport: `overflow-x-auto custom-scrollbar`, `gap-4 px-4 py-2`, `scroll-smooth`.
- Click chevron scrolls viewport by ~1 thumbnail width.

### 2. Captured images rail (lines ~450–504)
- Replace the current `<div className="flex flex-1 gap-2 overflow-x-auto …">` with `ThumbRail`.
- Each capture thumb: keep current 220px width, switch to `rounded-lg`, drop `ring-offset`, use a single 2px border (cyan when active, status color when approved/rejected, transparent otherwise).
- Keep status badges as-is.

### 3. AI suggested matches rail (lines ~556–615)
- Replace the suggestion list wrapper with `ThumbRail`.
- Suggestion card: same `rounded-lg`, single 2px border (cyan when active), no `ring-2`. Keep internal layout (image + label + score).
- Increase card spacing via the rail's `gap-4`.
- Keep the `1 / N` pager in the section header.

### 4. Header polish (both rails)
- Keep the existing 32px header strip with label + counter.
- Remove the `border-b border-border/60` under the header so the rail reads as one piece, matching the reference's open black surface.

## Out of scope
- No changes to behavior (selection, keyboard nav, status semantics).
- No changes to the catalog search table or empty-state grid.
- No changes to layout grid / card heights.

## Files touched
- `src/components/out-of-catalog/ReviewSession.tsx` — only the two rail blocks + one small inline `ThumbRail` helper.
