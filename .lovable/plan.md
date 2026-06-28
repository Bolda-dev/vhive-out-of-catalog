
## Goal

After clicking **Start Session**, the table area on `/out-of-catalog` should be replaced in place by the full review-session experience (compare panels, suggestions, shortcut bar). The page's `TopBar` stays visible. The review session's own header (the "Session Review" bar with the X close button) is removed. Keyboard shortcuts and all interaction logic remain identical.

## Changes

### 1. Extract review session into a reusable component
- Create `src/components/out-of-catalog/ReviewSession.tsx`.
- Move the entire `ReviewSessionPage` body (state, memos, keyboard handler, `<section>` with the two compare cards, shortcut bar, dialogs, bind burst, toaster) into it.
- Drop the outer `fixed inset-0 z-50` wrapper and the `<header>` block (Session Review title + X). Keep only the content.
- Accept an `onExit: () => void` prop, used by:
  - the existing **Skip session** shortcut/button,
  - the **Session complete → back** action.
- Internal helpers (`CaptureImagePanel`, `NoSuggestionsEmpty`, `ShortcutBar`, `BindBurst`, `playBindSound`, etc.) move with it (either kept in the same file or split if convenient; behavior unchanged).

### 2. Wire it into `/out-of-catalog`
- In `src/routes/out-of-catalog.tsx`:
  - Add `const [inSession, setInSession] = useState(false)`.
  - `startSession`: keep the `SessionLoader` step animation; at the final step set `inSession(true)` instead of `navigate({ to: "/review-session" })`.
  - When `inSession` is true, render `<ReviewSession onExit={() => setInSession(false)} />` in place of the toolbar + `<OutOfCatalogTable>` + `<Pagination>` block. `TopBar` stays mounted above it.
  - When `inSession` is false, render the table as today.

### 3. Retire the standalone route
- Delete `src/routes/review-session.tsx` (the auto-generated route tree will drop the `/review-session` entry on next build).
- Remove any remaining `useNavigate({ to: "/review-session" })` calls (only the one in `startSession`).

### 4. Verify
- Build passes (no dangling imports of the deleted route).
- Click **Start Session** → loader plays → table area swaps to the review UI, `TopBar` unchanged, no second header.
- Keyboard shortcuts (Enter, Backspace, arrows, F, S, U, Ctrl+Enter, Delete) still work.
- **Skip session** (`S`) and **Session complete → back** return to the table view via `onExit`.

## Out of scope

No visual changes to the review session content itself, no changes to shortcuts, toasts, or the table.
