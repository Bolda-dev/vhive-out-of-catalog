## Goal
Restructure the Review Session into two clear phases per item:
1. **Approving** — focus on the left card; user must approve/reject every captured image. The right card (catalog reference + AI suggestions) is dimmed with a clear "approve all images first ←" hint.
2. **Reviewing** — once every capture has a decision, the left card collapses to a 2-col grid showing every image (dimmed, with status badge + 3-dot menu to change), and the right card unlocks for AI suggestions and binding.

Also: replace the 3-step Start Session loader with a flat 300ms skeleton.

## Changes

### 1. Start Session loader → 300ms skeleton
- `src/routes/out-of-catalog.tsx`: collapse the staged 0/1/2/clear timers (currently 450 + 900 + 1400 ms) into a single 300 ms timeout that flips `inSession` to true. Remove `loaderStep` state and the step prop pass-through.
- `src/components/out-of-catalog/SessionSkeleton.tsx`: remove the top "Gathering / Sorting / Preparing" status row + step dots. Keep only the two shimmer cards. Drop the `step` prop.

### 2. Decouple approvals from selected suggestion
- `src/components/out-of-catalog/ReviewSession.tsx`: change the approvals key from `${row}|${suggestion}|${capture}` to `${row}|${capture}`. Approve/Reject is now a property of the photo itself, not of a suggestion match. Update `statusFor`, `setStatus`, `allApproved`, the captures rail border colors, and the keyboard handlers accordingly.
- Add a derived `allDecided` (every capture is `approved` or `rejected`) and a `phase` = `"approving" | "reviewing"`.
- The bottom-strip Approve/Reject buttons remain; they advance to the next pending capture; when none is left, `phase` becomes `"reviewing"` automatically.

### 3. Right card gating during "approving" phase
- Wrap the right card body in a relative container; render the existing catalog-reference + suggestions content with `opacity-40 pointer-events-none` while `phase === "approving"`.
- Overlay a centered empty state: small left-arrow icon + "Approve all images first" copy + a muted subtitle "Once every capture is approved or rejected, AI suggestions will unlock here." Use existing tokens (no new colors).
- The search/unrecognize/new-equipment/bind buttons in the top header stay disabled while `phase === "approving"` (visually muted, `disabled` attribute).

### 4. Left card in "reviewing" phase — 2-col grid
- When `phase === "reviewing"`, replace `CaptureImagePanel`'s hero+rail with a 2-column grid of every capture (auto-rows, gap-3, `opacity-60` to read as completed).
- Each grid card:
  - Full thumbnail (object-cover, aspect 4/3 or matches existing capture ratio).
  - Status pill top-left: green check "Approved" / red x "Rejected", same colors as today (#8FD3A8 / #d97a72).
  - 3-dot button top-right opens a tiny dropdown menu (shadcn DropdownMenu) with: "Mark approved", "Mark rejected", "Clear decision". "Clear decision" sets the capture back to pending and snaps `phase` back to `"approving"`, jumping to that capture.
- Below the grid, a small ghost button "← Re-do approvals" that clears all decisions for the current row and returns to `"approving"` phase.
- Keep the existing card header (ID block) unchanged.

### 5. Suggestions rail copy nit
- While the right card is locked, the "AI suggested matches" header stays visible but greyed out (consistent with the rest of the card). No layout change.

## Out of scope
- No new icons, colors, fonts, or libraries.
- No change to keyboard shortcut keys themselves (A/R still approve/reject in approving phase; suggestion navigation only active in reviewing phase).
- No change to the catalog search panel, empty state, or rails styling shipped last turn.

## Files touched
- `src/routes/out-of-catalog.tsx` (loader timing)
- `src/components/out-of-catalog/SessionSkeleton.tsx` (drop status row)
- `src/components/out-of-catalog/ReviewSession.tsx` (phase logic, key scope, right-card overlay, header button gating)
- `src/components/out-of-catalog/CaptureImagePanel.tsx` (accept `phase`; render hero+rail or 2-col grid based on it; expose per-card 3-dot menu)
