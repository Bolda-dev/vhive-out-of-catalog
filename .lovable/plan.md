
## Goal

All captures are taken perpendicular to the equipment, so the crop tool should never produce a free quadrilateral. Two changes:

1. **Crop = rectangle, always.** Replace the free 4-point polygon with an axis-aligned rectangle. Dragging any handle adjusts the rectangle's bounds only.
2. **Images = perpendicular front-on shots.** Regenerate the 6 mock rack photos so they look like they were taken straight-on (camera plane parallel to the rack face), matching the new constraint.

No other UI changes — same Crop/Done button, same overlay style, same re-run-AI toast on confirm.

## Crop tool changes (`src/routes/review-session.tsx`)

State model switches from `Pt[]` (4 free points) to a single rect:

```ts
type Rect = { x: number; y: number; w: number; h: number }; // % of container
const DEFAULT_RECT: Rect = { x: 20, y: 18, w: 60, h: 64 };
```

Rendering:
- Replace both `<polygon>` elements with `<rect>` (same dark halo + cyan stroke + 8% cyan fill).
- 4 corner handles only (no midpoints), positioned at the rect's corners.

Dragging:
- Each corner handle is bound to one corner. On pointer move, update only `x`/`y`/`w`/`h` so the opposite corner stays fixed — guarantees the shape stays a rectangle.
- Clamp to 2–98% of the container; enforce min width/height (e.g. 8%).
- No midpoint or edge drag in v1 (corner-only is enough and matches the current 4-handle feel).

Everything else stays: Crop button overlay, Done toggle, "Re-running AI search with new crop" toast, reset on `captureKey` change.

## Image regeneration

Regenerate the six rack assets as front-on, perpendicular telecom rack photos (camera level with the rack, no perspective skew, no angled view):

- `src/assets/racks/rack-01.jpg`
- `src/assets/racks/rack-02.jpg`
- `src/assets/racks/rack-gen-1.jpg`
- `src/assets/racks/rack-gen-2.jpg`
- `src/assets/racks/rack-gen-3.jpg`
- `src/assets/racks/rack-gen-4.jpg`

Prompt direction: "Photo of an outdoor/indoor telecom equipment rack, shot perpendicular to the rack face, camera level, no perspective distortion, daylight, realistic field photo." Keep variety across the six (different rack types, locations, lighting) so the gallery still feels diverse.

No changes to `mockOutOfCatalog.ts`, `mockCatalog.ts`, or filenames — the regenerated jpgs reuse the existing asset paths.

## Out of scope

- Catalog reference images (those stay as-is).
- Adding rotation, aspect-ratio lock, or numeric crop inputs.
- Persisting the crop server-side.
