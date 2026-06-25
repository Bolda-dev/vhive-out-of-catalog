# Prompt #3 — Confirm & Bind feedback

Small change to `src/routes/review-session.tsx`. No data layer changes — the row is already marked in local `decisions` state.

## Behavior

1. Click on **Confirm & Bind (N)** (or Enter shortcut) when an `aiSuggestion` exists:
   - Set `decisions[current.id] = "bound"` (already happens).
   - Show an **inline blue success banner** at the top of the case panel: "New equipment bound successfully — {manufacturer} {model}".
   - Remove the toast for this specific action (banner replaces it). Toasts for Skip / Unrecognized / Add stay as-is.
   - After ~900 ms, auto-advance to the next object and clear the banner.
2. Disabled when `aiSuggestion` is null (already the case).

## Banner UI

New local component `BindBanner` rendered conditionally above the chips row inside the top section:

- Success variant: `bg-brand/15 border border-brand/40 text-foreground`, icon `Check` in brand cyan `#3BB6E9`, dismiss `×` on the right.
- Error variant (demo only): `bg-red-500/15 border border-red-500/40`, icon `AlertCircle` in `#EF4444`. Triggered by a small dev-only "Simulate error" link inside the success banner — keeps the demo state reachable without polluting the main UI.

State:
```ts
const [banner, setBanner] = useState<
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null
>(null);
```

## Flow

```
confirmBind():
  setDecisions(...)            // mark bound
  setBanner({ kind: "success", message: `New equipment bound successfully — ${suggestion.manufacturer} ${suggestion.model}` })
  setTimeout(() => {
    setBanner(null)
    goNext()
  }, 900)
```

Clear `banner` on every `goNext` / `goPrev` so it never leaks across objects.

## Out of scope

- Real persistence / undo.
- Animating the banner (a simple `transition-opacity` is fine).
- Wiring the error state to any real failure — it's purely a visual demo toggle.
