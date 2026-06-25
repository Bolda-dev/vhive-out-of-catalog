# Out-of-Catalog Management — Plan

Port the full table system from the **Drone Workflow Manager** project and re-skin it as the "Out-of-Catalog Management" screen shown in the Figma reference / attached screenshot.

## What gets copied from the source project

From `src/components/line/` in Drone Workflow Manager (all behaviors preserved):

- `TasksTable.tsx` → renamed `OutOfCatalogTable.tsx` (drag-to-reorder headers, column resize, per-column filters in a second header row, sort, sticky header, custom scrollbar)
- `Pagination.tsx` → reused as-is (page numbers, prev/next/first/last, page-size selector — matches the footer in the screenshot)
- `ColumnDropdown.tsx`, `ColumnManagerDialog.tsx` → column show/hide + ordering
- `MultiSelectFilter.tsx` → used by Status / Equipment Type filter dropdowns
- `TableToolbar.tsx` → top toolbar (entries counter on the left, "Auto-Bind Attempt" button on the right)
- `TopBar.tsx` → renamed/adapted to vHive top bar (logo, Equipment / Out-of-catalog Management / Civil Survey Categories tabs, user name + menu icon)
- `RowActions.tsx` → the trailing chevron + per-row actions
- Dark theme tokens from `src/styles.css` (background, border, row-hover, brand purple used for `Auto-Bind` icon and sort indicators) ported into our `src/styles.css` as semantic tokens

UI primitives already exist locally under `src/components/ui/*` (shadcn) — reuse those; do not re-copy.

## New / changed pieces for this project

1. **Route**: `src/routes/out-of-catalog.tsx` rendering the page; redirect `src/routes/index.tsx` to it (replaces the placeholder).
2. **Data model** `src/data/outOfCatalogTypes.ts`:
   - `status: "Pending" | "Unrecognized"`
   - `detectedOn: string` (formatted `DD-MM-YYYY HH:mm:ss`)
   - `equipmentType`, `manufacturer`, `model`, `instances: number`, `rackUnits?: string`, `account`, `hasLink: boolean`
3. **Mock data** `src/data/mockOutOfCatalog.ts` — 200 rows mirroring the screenshot (Zebra/Cheeta/Edge Router/Battery/Macro Cell Antenna/Mounted Amplifier/Shelter etc.).
4. **Columns** (in this order, matching the screenshot):
   `Detected on` · `Status` · `Equipment Type` · `Manufacturer` · `Model` · `Instances` · `Rack Units` · `Account` · `Link` · `Actions`
   - Header row 1: label + sort caret + drag handle + resize grip
   - Header row 2: per-column controls — `Select…` dropdowns for Status & Equipment Type; `Search` text inputs for Manufacturer / Model / Instances / Account; empty cells for Detected on, Rack Units, Link, Actions
5. **Row action cells** (right side):
   - Pending rows → three buttons: `Add New & Bind` (purple wand icon), `Bind to Existing` (globe icon), `Mark as Unrecognized` (question-mark icon) + chevron
   - Unrecognized rows → `Mark as Unrecognized` is disabled
   - Some rows have only the external-link icon under the Link column and no action buttons (matches screenshot)
6. **Toolbar**: left `Showing X to Y of N entries`, right `Auto-Bind Attempt` button with wand icon (purple stroke).
7. **TopBar**: vHive arrow-logo placeholder, three tabs with active underline in brand purple on `Out-of-catalog Management`, right-side `Barel` + hamburger.

## Technical notes

- TanStack Start file-based routing — new route is `src/routes/out-of-catalog.tsx` with proper `head()` metadata (title "Out-of-Catalog Management | vHive", description, og tags).
- All copying done via `cross_project--read_project_file` then `code--write`; imports rewritten from `@/components/line/*` to `@/components/out-of-catalog/*`, and from `@/data/lineTypes`/`mockTasks` to the new data files.
- Dark theme: extend `src/styles.css` with the source project's tokens (`--brand`, `--row-hover`, surface `#121212`, etc.) as semantic CSS variables — no hard-coded hex in components beyond what's already in the source files we're porting.
- Out of scope for this turn: real backend, the actual `Auto-Bind` algorithm, the bind/add dialogs (action buttons render and are wired to toast stubs only).

## Open question

The screenshot is a single page; the source project also has BulkEditsDialog, TaskTimer, PriorityCell, AssignedToCell, WorkerCell, ProfileSwitcher, TaskTabs — these don't appear in the Out-of-Catalog screen. **I'll skip porting them.** Tell me if you want them carried over anyway.
