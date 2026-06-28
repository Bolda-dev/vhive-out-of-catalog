## Changes to `src/components/out-of-catalog/ReviewSession.tsx`

### 1. Disable header actions during the "approving" phase
Currently only the `Bind` button is gated by `phase !== "reviewing"`. The other primary header controls remain clickable, which contradicts the rule that nothing on the right-hand flow should be triggerable until every captured image has been approved/rejected.

Apply the same `disabled={phase !== "reviewing"}` gate to:
- "Search from catalog" (and the `F` keyboard shortcut that opens it)
- "Unrecognize"
- "New equipment"
- "Bind" (already gated — keep)

Disabled styling: `disabled:cursor-not-allowed disabled:opacity-40`, matching the existing Bind button. Tooltips switch to "Approve or reject every captured image first" while disabled.

### 2. Merge into a Bind split-button
Replace the three separate buttons (`Unrecognize`, `New equipment`, `Bind`) with a single split-button group:

```text
┌────────────────────┬───┐
│  ⊙  Bind           │ ▾ │
└────────────────────┴───┘
```

- Left segment: primary `Bind` action (cyan `#3BB6E9`, current styling, same disabled rule, Enter shortcut).
- Right segment: chevron toggle that opens a dropdown menu (shadcn `DropdownMenu`) with:
  - `New equipment` (icon: `AddNewBindIcon`, shortcut `Ctrl+Enter`)
  - `Unrecognize` (icon: `MarkUnrecognizedIcon`, shortcut `U`)
- The chevron segment inherits the same disabled state and tooltip as Bind during the approving phase.
- Visual: a thin divider (`bg-black/20`) between the two segments, both share the cyan background, same height (`h-9`), rounded only on the outer corners.

### 3. Dim the "Search from catalog" placeholder
When the search pill is collapsed (button state), reduce its label + icon opacity to 50% so it reads as a placeholder rather than a primary action.

- Apply `opacity-50` to the collapsed-state button content (icon + "Search from catalog" text).
- On hover, raise to `opacity-100` for affordance.
- When expanded (input visible), opacity stays 100% as today.

### Out of scope
- Keyboard shortcuts keep working (the split-button doesn't change shortcut bindings).
- No changes to the bottom shortcut bar, the captures grid, or the right-panel suggestions logic.
