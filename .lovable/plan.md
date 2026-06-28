## Goal
Turn the top strip of the Captured Image card into a proper "ID card" for the AI suggestion, and remove the on-image metadata overlay.

## Changes — `src/components/out-of-catalog/ReviewSession.tsx`

### 1. `CaptureImagePanel` header → ID card
Replace the current single-row strip (label "Captured image" + Type/Manufacturer/Model + status pill) with a denser ID card containing:

- **Suggestion identity** (from the top AI suggestion, same source as today):
  - Type
  - Manufacturer
  - Model
- **Capture context**:
  - Timestamp + date (`capturedAt`)
  - Account (e.g. Verizon) — small chip
  - Rack — shown as a link-styled control (icon + rack label parsed from `location`), no real navigation; on click fire an `appToast` "Opening rack …" placeholder.

Layout: two rows inside the same bordered header area.
- Row 1: `Type · Manufacturer · Model` as the prominent line (same `MetaField` style, slightly larger value text).
- Row 2: muted line — timestamp/date · account chip · rack link, right-aligned approval status pill kept where it is today.

Header background stays `bg-surface`; bottom border preserved. No height jump that breaks the existing `h-full` image area (use `shrink-0`).

### 2. Remove on-image metadata overlay
Delete the `metaBottomLeft` overlay block (the `absolute bottom-0 left-0 …` chip) and the `metaBottomLeft` prop wiring. The Crop button moves back to `bottom-2 left-2` since there is no longer a metadata chip to sit above.

### 3. Props / call site
- `CaptureImagePanel` props: drop `metaBottomLeft`; add `capturedAt`, `account`, `rack`.
- In the parent (line ~380), pass:
  - `capturedAt={currentCapture?.capturedAt}`
  - `account={current.account}`
  - `rack={currentCapture?.location}` (already contains the rack segment)

No data-model or business-logic changes; mock data already supplies all fields.

## Out of scope
- No changes to the right-side catalog/suggestions card.
- No changes to the thumbnail rail, shortcut bar, or table view.
- No real rack navigation — link is a visual + toast only.