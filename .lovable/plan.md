## Create Equipment sidebar + reference image modal

Replace the current "New equipment" confirmation flow with a right-side sidebar (Sheet) that mirrors the uploaded reference, and add a reference-image dialog with AI description generation.

### 1. New `CreateEquipmentSheet.tsx` (right sheet, dark theme, Roboto 14px)
Header: `‹ Create Equipment` (back arrow closes the sheet).

Fields (all required marked with `*`, dark inputs `#1E1E1E`, 14px Roboto):
- **Category*** — disabled/prefilled `Rack Mounted` (greyed)
- **Classification*** — select (Active / Passive / Cabling / Other)
- **Type*** — select (Switch, Router, Firewall, Server, PDU, Patch Panel, …)
- **Manufacturer*** — combobox, prefilled `Fortinet`, with red helper text `Not found in the catalog list` when value is free-text
- **Model*** — text, prefilled `Unknown`
- **Weight (kg)*** — number
- **Height (U)*** — number
- **Width (m)*** — number
- **Depth (m)*** — number
- **Power Consumption (W)** — number (optional)
- **Thermal Emission (BTU/hr)** — number (optional)

Footer (sticky): `Cancel` (outline) + `Add New & Bind (N)` primary cyan, where N = approved captures count. Disabled until required fields filled.

### 2. Reference-image section (inside the sheet, above the form or as first row)
- Thumbnail tile (square, ~160px) showing the current main image (default = first approved capture). 
- Hover → "Edit reference image" button opens **ReferenceImageDialog**.

### 3. New `ReferenceImageDialog.tsx`
Layout: large image preview (left) + description panel (right).

**Image controls:**
- `Upload` button (file input, image/*) — replaces current image with object URL
- `Remove` button — clears image (disabled if none)

**AI description panel:**
- On open (and after each upload): show loader stripe + text `Gemini is generating a description…` for ~1.2s
- Then populate a `<textarea>` with mock LLM output (e.g., `"Rack-mounted Fortinet firewall, 1U chassis, dual power supplies visible, front-facing console port and 8 SFP+ uplinks."`)
- Textarea is editable
- Footer: `Cancel` (revert) + `Confirm` (commit image + description back to the sheet)

### 4. Wiring in `ReviewSession.tsx`
- Replace the existing "New equipment" `AlertDialog` (and search-panel "Create new") with `setCreateOpen(true)` to open the sheet.
- Keep the existing "rejected captures move to a separate group" warning, but render it as an inline banner at the top of the sheet body when `hasRejected` is true (no extra modal step).
- On submit: fire existing `appToast` success, exit session as before.
- Keyboard `Ctrl/⌘+N` (or current "new equipment" shortcut) opens the sheet.

### Files
- **Create** `src/components/out-of-catalog/CreateEquipmentSheet.tsx`
- **Create** `src/components/out-of-catalog/ReferenceImageDialog.tsx`
- **Edit** `src/components/out-of-catalog/ReviewSession.tsx` — swap "New equipment" alert for the sheet; pass `approvedCount`, `hasRejected`, `defaultImage` (first approved capture).
- Reuse existing `Sheet`, `Dialog`, `Input`, `Select`, `Button`, `appToast`.

### Out of scope
- No real Gemini call (mock loader + canned description; can wire to AI Gateway later).
- No persistence to backend — local state only, consistent with current prototype.
