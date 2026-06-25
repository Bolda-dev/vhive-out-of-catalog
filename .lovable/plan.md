
# Horizontal Compare — Review Session v2

Replaces the current `/review-session` layout entirely. Same route, same entry from "Start Session". The whole screen becomes a compare workspace centered on **one AI suggestion at a time**, with the user approving/rejecting each captured image against that suggestion's reference.

## Layout (top → bottom)

```text
┌───────────────────────────────────────────────────────────────────┐
│ Header: Session Review · breadcrumb (Type · Confidence)      [X]  │
├───────────────────────────────────────────────────────────────────┤
│  Current suggestion chip:  [ #CAT-00123  Cisco Catalyst 9300 ]    │  ← "id card" above images, bold but quiet
│                            Match 87%                              │
├──────────────────────────────┬────────────────────────────────────┤
│                              │                                    │
│   REFERENCE IMAGE (catalog)  │   CAPTURED IMAGE (current)         │
│   landscape, object-contain  │   landscape, object-contain        │
│                              │   overlay: date · location         │
│                              │   status pill: Approved / Rejected │
│                              │                                    │
├──────────────────────────────┴────────────────────────────────────┤
│  Capture strip (horizontal, under the two images):                │
│  [✓ img1] [✗ img2] [• img3-current] [ img4 ] [ img5 ] …  3/8      │
├───────────────────────────────────────────────────────────────────┤
│  Suggestion rail (horizontal, bottom): scrollable cards            │
│  [card] [card] [CURRENT-card highlighted] [card] [card]  2/5      │
│  (no Bind button, no "Selected" tag on cards — current = ring)    │
├───────────────────────────────────────────────────────────────────┤
│  Shortcut bar (sticky bottom), grouped:                            │
│   Image:       Enter Approve · Backspace Reject · ← → Prev/Next   │
│   Suggestion:  ↑ ↓ Prev/Next suggestion · Del Dismiss · F Search  │
│   Global:      Ctrl+Enter Add as new · S Skip · U Unrecognize     │
│                                  [ Bind ] (enabled only if all ✓) │
└───────────────────────────────────────────────────────────────────┘
```

The old vertical 3-column top section, the side capture rail, and the side suggestion list are removed. The bottom split with reference vs candidates is replaced by the top reference/captured pair.

## Interaction model

Two cursors:
- **Image cursor** — which captured image is being compared right now.
- **Suggestion cursor** — which AI candidate the user is comparing against.

Per (suggestion, image) pair we store one of: `pending | approved | rejected`. State is local to the session (no backend).

### Keyboard

Grouped exactly as shown in the shortcut bar.

| Key | Action |
| --- | --- |
| `Enter` | If current image is pending → Approve. If all images for current suggestion are approved → trigger **Bind** (opens existing confirm AlertDialog). |
| `Backspace` | Reject current image. |
| `←` / `→` | Previous / next captured image (same suggestion). |
| `↑` / `↓` | Previous / next AI suggestion. Resets image cursor to first pending image of that suggestion. |
| `Delete` | Dismiss current suggestion (existing dismiss flow + undo toast). Advances to next suggestion. |
| `Ctrl+Enter` | Add as new & bind (uses existing Add-new action). |
| `F` | Open catalog search (manual search button behavior). |
| `S` | Skip session — closes the overlay, returns to table without changes. |
| `U` | Mark current OOC row as Unrecognized (existing row action), closes overlay. |

Bind is **disabled** unless every captured image for the current suggestion is `approved`. Hitting `Enter` while still pending just approves the current image and advances to the next pending one; only when none remain does `Enter` fire Bind.

### Mouse equivalents

- Approve/Reject pills on the captured image act as buttons.
- Clicking a thumbnail in the capture strip jumps the image cursor.
- Clicking a card in the suggestion rail jumps the suggestion cursor.
- The Bind button in the shortcut bar is always visible, disabled until ready.
- Dismiss stays as the `×` on each suggestion card (still red `danger` token).

## Visual notes

- Reference image and captured image: equal width (50/50), `object-contain`, `bg-[#1E1E1E]` panel, no extra metadata under the reference (the suggestion chip above replaces it).
- Suggestion ID chip: surface `#1E1E1E`, 1px border `#2A2A2A`, ID in `text-foreground/90`, model in muted, match % using existing `MatchScoreBadge` (desaturated). No "Selected" badge anywhere — current card uses a 2px cyan ring (`#3BB6E9`) like the capture rail selection.
- Capture strip thumbnails: ~96×72, `object-cover`, status corner badge (cyan ✓ for approved, `danger` ✗ for rejected, neutral dot for pending). Current image has cyan ring. Custom cyan scrollbar (already defined).
- Suggestion rail cards: existing card visuals minus the Bind button and Selected pill; keep image, manufacturer/model, MatchScoreBadge, Dismiss (×).
- Shortcut bar: single horizontal bar, three labeled groups separated by vertical dividers, `text-xs text-muted-foreground`, key chips in mono. Bind button right-aligned in cyan (`bg-primary`), disabled state at 40% opacity.

## Files

- `src/routes/review-session.tsx` — replace the body with the new layout. Keep the existing imports for toasts, AlertDialog, dismiss/undo, AI description editor (moved into a small popover on the suggestion chip), and the existing data hooks. Keep the session header and `X` close.
- `src/components/out-of-catalog/CompareImagePanel.tsx` *(new)* — the reference/captured image cell with status overlay and approve/reject pills.
- `src/components/out-of-catalog/CaptureStrip.tsx` *(new)* — horizontal capture thumbnails with status badges + cyan scrollbar.
- `src/components/out-of-catalog/SuggestionRail.tsx` *(new)* — horizontal candidate cards (stripped down; reuses MatchScoreBadge and existing Dismiss).
- `src/components/out-of-catalog/ShortcutBar.tsx` *(new)* — grouped shortcut hints + Bind CTA.
- `src/hooks/useReviewSession.ts` *(new)* — owns image cursor, suggestion cursor, approval map, keyboard handler. Keeps the route component small.

No changes to the table page, mock data shape, theme tokens, or routing. No backend touched.

## Out of scope

- Persisting approvals to a backend.
- Multi-select bind (binds one suggestion at a time, as today).
- Reordering or editing suggestions beyond the existing dismiss/undo.
- Changing the polygon/crop tool — for v2 it's removed from the layout (can return later if you want it back on the captured image).
