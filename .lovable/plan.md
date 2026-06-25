# Prompt #1 — Mock data model + table enrichments

Front-end only, all state local. No backend calls.

## 1. Extend data model (`src/data/outOfCatalogTypes.ts`)

Add new types alongside existing `OocRow`:

- `OocStatus` → extend to `"Pending" | "Unrecognized" | "Mixed"`.
- `OocCapture` — `{ id, imageUrl, surveyId, capturedAt, location, aiDescription }`.
- `CatalogItem` — `{ id, type, manufacturer, model, category, classification, heightU, widthM, depthM, weightKg, powerW, thermalBtu, referenceImageUrl }`.
- Extend `OocRow` with: `captures: OocCapture[]` (1–5), `confidence: number` (0–100), `aiType`, `aiManufacturer`, `aiModel` (strings, some `""` or `"Invalid"`), `aiSuggestionId?: string` (FK into catalog, optional).

Existing fields (`detectedOn`, `status`, `equipmentType`, `manufacturer`, `model`, `instances`, `rackUnits`, `account`, `hasLink`) stay as-is — `instances` will be derived/aligned with `captures.length` in the mock.

## 2. New mock files

- `src/data/mockCatalog.ts` — ~10 `CatalogItem`s spanning Switch / Router / Server / PDU / Patch Panel etc. `referenceImageUrl` uses `https://picsum.photos/seed/<slug>/200/200`.
- Rewrite `src/data/mockOutOfCatalog.ts` — ~12 hand-authored rows:
  - 1–5 captures each, distinct `surveyId` + `location` + timestamps, `imageUrl` from picsum seeded by row+capture index.
  - Mix of statuses: ~7 Pending, ~3 Unrecognized, ~2 Mixed.
  - Confidence values spread across <50 / 50–80 / >80 buckets.
  - ~8 rows have `aiSuggestionId` pointing into mock catalog; ~4 don't.
  - A couple rows with `aiType: "Invalid"` or empty AI fields.

## 3. Table changes (`OutOfCatalogTable.tsx`)

- **Thumbnail** in the Equipment Type cell: render `captures[0].imageUrl` as a 32×32 rounded image to the left of the type text. If no captures, show a neutral placeholder block.
- **New "Confidence" column** inserted right after Equipment Type:
  - Sortable.
  - Cell = number `0–100` + colored pill badge.
    - `<50` → red (`#EF4444` bg @ 16% opacity, red text)
    - `50–80` → orange (`#F2D066` family — use `#F59E0B`)
    - `>80` → green (`#22C55E`)
  - Add to `ALL_OOC_COLUMNS`, `DEFAULT_VISIBLE_COLUMN_IDS`, `getRowSortValue` (numeric).
  - Filter cell: leave empty for now (no spec).
- **Status filter options**: add `Mixed`.

## 4. Route toolbar (`src/routes/out-of-catalog.tsx`)

Add **Start Session** as the primary CTA to the left of `Auto-Bind Attempt`:
- Filled brand button: `bg-brand text-background hover:bg-brand/90`, same height (`h-9`), `font-medium`.
- `onClick` → `toast.success("Session started")` (placeholder).

Update `Filters.status` type to include `"Mixed"`.

## 5. Preserved

All existing columns, filter row, drag-reorder, resize, sort, sticky header, pagination, row actions, TopBar — untouched aside from the additions above.

## Open clarification

You wrote "שורות אם/בן הניתנות להרחבה" (parent/child expandable rows). The current table has **no** expand/collapse mechanism — each row is flat. I'm reading "שמור" as "don't break anything that exists," so I will **not** add expandable rows in this prompt. If you actually want a parent-row expand that reveals the captures gallery, tell me and I'll fold it in (or save it for prompt #2).

## Technical notes

- Confidence badge uses inline `style` for the three hex colors (consistent with how Pending yellow is handled today) so Tailwind purge doesn't strip them.
- Picsum URLs are stable per seed — good for prototype, zero asset weight.
- No new dependencies.
