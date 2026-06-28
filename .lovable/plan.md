## Goal

Tighten the reviewing-phase layout in `src/components/out-of-catalog/ReviewSession.tsx`:

1. Left and right cards stretch to the bottom of the viewport (above the shortcut bar) and scroll internally instead of pushing the page.
2. In the reviewed gallery, swap the surface background for the page's dark background so thumbnails sit on `bg-background`.
3. Drop the "Reject" status pill from the ID card header (only approved/pending will appear there — and once we move approvals off the right card, no chip is needed at all on reject).
4. Remove the "Reviewed captures — N of N" + "Re-review all" header row above the grid.
5. Strip the bottom action bar on each thumbnail. Keep only the corner status badge (green check / red ×). Add a small kebab (⋯) button in the opposite corner that opens a dropdown with: **Re-review this image** and **Re-review all images**.

## Changes

### `src/components/out-of-catalog/ReviewSession.tsx`

- **Outer container height**: change the root from `min-h-[calc(100vh-104px)] flex-1 flex-col … pb-[76px]` to a fixed-height flex column (`h-[calc(100vh-104px-76px)]`) so the inner `flex-1` section actually has a bounded height. The compare `section` keeps `min-h-0 flex-1`, and each card already has `min-h-0 overflow-hidden`, so the cards now end at the page bottom and any overflow scrolls inside.
- **ID header status chip** (~lines 1167–1178 inside `CaptureImagePanel`): delete the `{status && status !== "pending" && …}` block entirely so neither approved nor rejected status renders in the header.
- **Grid header row** (lines 1214–1228): delete the whole `<div className="flex h-9 shrink-0 …">…</div>` wrapper that holds the count text and the "Re-review all" button.
- **Grid container background**: on the scroll wrapper currently `className="ooc-thumb-scroll min-h-0 flex-1 overflow-y-auto p-3"`, add `bg-background` so the gallery surface matches the page. The outer `CaptureImagePanel` root stays `bg-surface` for the header strip; only the grid body is darkened.
- **Thumbnail cards** (lines 1236–1294):
  - Keep the rounded bordered tile and the status badge in the top-right (green check / red ×). Drop the saturate/brightness filter and the `opacity: 0.85` so thumbnails read as normal photos with just a status accent.
  - Remove the bottom action row (`Re-review` ghost button + per-status ✓/× buttons).
  - Add a kebab button in the top-left corner: `inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur` containing `MoreVertical` from `lucide-react`. Wire it through shadcn `DropdownMenu` (already in `src/components/ui/dropdown-menu.tsx`) with two items:
    - **Re-review this image** → `onCaptureClearStatus?.(cap.id)` (existing handler that clears that capture's decision and snaps phase back to "approving" on that capture).
    - **Re-review all images** → `onResetAllApprovals?.()` (existing handler).
- **Imports**: add `MoreVertical` to the `lucide-react` import in `CaptureImagePanel` and add the shadcn `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` imports.

## Out of scope

- No changes to the right card, suggestion rail, shortcut bar, search panel, approving-phase hero, or any colors/tokens beyond what's listed.
- No new icons, fonts, or libraries beyond `MoreVertical` (already in `lucide-react`) and the existing `DropdownMenu`.
- Keyboard shortcuts unchanged.

## Files touched

- `src/components/out-of-catalog/ReviewSession.tsx`
