# Prompt #2 — Review Session screen

A full-screen modal-route experience for going object-by-object through Pending items. Prototype only — local state, no persistence.

## Routing & entry

- New route: `src/routes/review-session.tsx` (`/review-session`).
- "Start Session" in `out-of-catalog.tsx` → `navigate({ to: "/review-session" })` instead of toast.
- Route loads `mockOutOfCatalog`, filters `status === "Pending"`, sorts by `confidence` asc (default). If empty → empty state with "Back to list".

## Local state

```
currentIndex: number
sortDir: "asc" | "desc"
captureIndex: number  // active thumbnail per object (resets on next/prev)
decisions: Record<rowId, "bound" | "skipped" | "unrecognized" | "added">
```

`queue = useMemo(() => pendingRows.sort(by confidence, sortDir))`.
`current = queue[currentIndex]`. Reaching past the last → "Session complete" summary card with counts per decision + "Back to list".

## Layout (dark, full viewport under TopBar)

Reuse `TopBar` for consistency. Page = `flex flex-col h-[calc(100vh-topbar)]`.

### Top half — the case (≈ 60% height)

Header bar:
- Left: chips `AI: <aiType>` · `<aiManufacturer>` · `<aiModel>` (chip = `bg-white/[0.06]` border `border/40` rounded-full). Empty/"Invalid" values render greyed-out chip.
- Middle-left: confidence pill (same `ConfidenceCell` colors red/orange/green) extracted into `src/components/out-of-catalog/ConfidenceBadge.tsx` so table + session share it.
- Right: `Prev` (←) · "X of N" · `Next` (→) · sort-toggle button (`ArrowUpDown` with current dir label).

Body grid: `grid grid-cols-[1fr_auto]`
- Hero image: large, `object-contain` on `bg-surface` rounded panel, max-h so caption stays visible. Source = `current.captures[captureIndex].imageUrl`.
- Right rail: vertical thumbnail strip (`flex flex-col gap-2 overflow-y-auto`) with all `captures`. Each thumb 64×64, active = `ring-2 ring-brand`. Label above rail: "{captures.length} captures".

Caption row below hero:
`📅 capturedAt  ·  📍 location · survey {surveyId}  —  {aiDescription}`
Icons are Lucide `Calendar` / `MapPin`. Uses `rgba(255,255,255,0.7)` text.

### Bottom half — the decision (≈ 40% height)

Single panel, `grid grid-cols-[1.4fr_1fr]` with divider.

**Left — AI suggestion**
- If `aiSuggestionId` resolves in `mockCatalog`:
  - Reference image (catalog `referenceImageUrl`) 120×120 rounded.
  - Title: `{type} · {manufacturer} · {model}`.
  - Meta rows: `{category} / {classification} · {heightU}U`.
  - Footer line: `In catalog · {Math.floor(Math.random()*40)+2} bound` (mock counter — seeded so it's stable per id).
- Else: empty state — dashed border panel, "No AI suggestion" headline, sub "Search the catalog manually" + small `Search` button that triggers the same handler as the right-column "Search catalog manually".

**Right — actions column** (vertical stack, `gap-2`)
- `Check` + "Confirm & Bind ({instances})" — primary brand-filled button (`bg-brand text-background`). Disabled if no `aiSuggestionId`.
- `Search` + "Search catalog manually" — outline `#E0E0E0` (matches Auto-Bind Attempt style).
- `Plus` + "Add as new equipment" — outline `#E0E0E0`.
- Divider line.
- Bottom row `grid grid-cols-2 gap-2`: "Skip" (`ArrowRight` icon) and "Mark Unrecognized" (`Flag` icon, purple `#A878EC` text).

All actions record into `decisions[current.id]` and advance to next via `goNext()`. Toast for each action ("Bound to catalog", "Skipped", "Marked Unrecognized", "Added as new").

## Keyboard shortcuts

`useEffect` listens on `window` while route is mounted:
- `Enter` → Confirm & Bind (if enabled, else no-op)
- `S` / `s` → Skip
- `ArrowLeft` → prev (clamped at 0)
- `ArrowRight` → next (advances; at end → completion screen)
- Ignored if `e.target` is `INPUT`/`TEXTAREA`.

Footer hint strip (subtle, `text-xs text-muted-foreground`): "Enter Confirm · S Skip · ← → navigate".

## Files

- `src/routes/review-session.tsx` — route + page component (most of the logic here for prototype simplicity).
- `src/components/out-of-catalog/ConfidenceBadge.tsx` — extracted shared pill.
- Refactor `OutOfCatalogTable.tsx`'s `ConfidenceCell` to use the shared component.

## Out of scope

- No real persistence; decisions live for the session lifetime.
- "Search catalog manually" opens nothing yet — toast placeholder. (Reserve for a later prompt.)
- No multi-select / bulk decisions.
- No image zoom/lightbox on the hero (basic `object-contain` only).
