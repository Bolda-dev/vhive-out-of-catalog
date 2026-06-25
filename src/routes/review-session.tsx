import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2 as CheckCircleIcon,
  Crop,
  Plus,
  Search,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { ConfidenceBadge } from "@/components/out-of-catalog/ConfidenceBadge";
import { mockOutOfCatalog } from "@/data/mockOutOfCatalog";
import { mockCatalog } from "@/data/mockCatalog";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { OocRow } from "@/data/outOfCatalogTypes";

export const Route = createFileRoute("/review-session")({
  head: () => ({
    meta: [
      { title: "Review Session — Out-of-Catalog — vHive" },
      {
        name: "description",
        content:
          "Compare captured images against AI-suggested catalog items and bind once all images are approved.",
      },
    ],
  }),
  component: ReviewSessionPage,
});

type Decision = "bound" | "skipped" | "unrecognized" | "added";
type ImgStatus = "pending" | "approved" | "rejected";
// key = `${rowId}|${suggestionCatalogId}|${captureId}`
type ApprovalMap = Record<string, ImgStatus>;

const pending = mockOutOfCatalog.filter((r) => r.status === "Pending");

function ReviewSessionPage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [dismissed, setDismissed] = useState<Record<string, Set<string>>>({});
  const [approvals, setApprovals] = useState<ApprovalMap>({});
  const [pendingBindId, setPendingBindId] = useState<string | null>(null);

  const queue = useMemo<OocRow[]>(
    () => [...pending].sort((a, b) => a.confidence - b.confidence),
    [],
  );
  const total = queue.length;
  const done = currentIndex >= total;
  const current = !done ? queue[currentIndex] : null;

  const suggestions = useMemo(() => {
    if (!current?.aiSuggestions) return [];
    const dset = dismissed[current.id] ?? new Set<string>();
    return current.aiSuggestions
      .filter((s) => !dset.has(s.catalogId))
      .map((s) => {
        const item = mockCatalog.find((c) => c.id === s.catalogId);
        return item ? { item, score: s.matchScore } : null;
      })
      .filter((x): x is { item: typeof mockCatalog[number]; score: number } => !!x);
  }, [current, dismissed]);

  const suggestionCount = suggestions.length;
  const safeSuggestionIdx = suggestionCount > 0 ? Math.min(suggestionIndex, suggestionCount - 1) : 0;
  const selected = suggestionCount > 0 ? suggestions[safeSuggestionIdx]! : null;

  const captures = current?.captures ?? [];
  const captureCount = captures.length;
  const safeCaptureIdx = captureCount > 0 ? Math.min(captureIndex, captureCount - 1) : 0;
  const currentCapture = captures[safeCaptureIdx] ?? null;

  const statusFor = useCallback(
    (capId: string): ImgStatus => {
      if (!current || !selected) return "pending";
      return approvals[`${current.id}|${selected.item.id}|${capId}`] ?? "pending";
    },
    [approvals, current, selected],
  );

  const allApproved = useMemo(() => {
    if (!current || !selected || captureCount === 0) return false;
    return captures.every((c) => statusFor(c.id) === "approved");
  }, [captures, captureCount, current, selected, statusFor]);

  const setStatus = useCallback(
    (s: ImgStatus) => {
      if (!current || !selected || !currentCapture) return;
      const key = `${current.id}|${selected.item.id}|${currentCapture.id}`;
      setApprovals((prev) => ({ ...prev, [key]: s }));
      // advance to next pending image if any
      const nextPendingIdx = (() => {
        for (let step = 1; step <= captureCount; step++) {
          const idx = (safeCaptureIdx + step) % captureCount;
          const cap = captures[idx];
          if (!cap) continue;
          const k = `${current.id}|${selected.item.id}|${cap.id}`;
          const status = idx === safeCaptureIdx ? s : (approvals[k] ?? "pending");
          if (status === "pending") return idx;
        }
        return -1;
      })();
      if (nextPendingIdx >= 0) setCaptureIndex(nextPendingIdx);
    },
    [approvals, captureCount, captures, current, currentCapture, safeCaptureIdx, selected],
  );

  const goNext = useCallback(() => {
    setCaptureIndex(0);
    setSuggestionIndex(0);
    setCurrentIndex((i) => Math.min(i + 1, total));
  }, [total]);

  const confirmBind = useCallback(() => {
    if (!current || !selected) return;
    setDecisions((prev) => ({ ...prev, [current.id]: "bound" }));
    toast.success(`Bound to ${selected.item.manufacturer} ${selected.item.model}`);
    goNext();
  }, [current, selected, goNext]);

  const skipSession = useCallback(() => {
    navigate({ to: "/out-of-catalog" });
  }, [navigate]);

  const markUnrecognized = useCallback(() => {
    if (!current) return;
    setDecisions((prev) => ({ ...prev, [current.id]: "unrecognized" }));
    toast.message("Marked as Unrecognized");
    goNext();
  }, [current, goNext]);

  const addAsNew = useCallback(() => {
    if (!current) return;
    setDecisions((prev) => ({ ...prev, [current.id]: "added" }));
    toast.success("Added as new equipment");
    goNext();
  }, [current, goNext]);

  const searchCatalog = useCallback(() => toast.message("Catalog search — coming soon"), []);

  const dismissSuggestion = useCallback(
    (catalogId: string) => {
      if (!current) return;
      const captureId = current.id;
      const item = mockCatalog.find((c) => c.id === catalogId);
      setDismissed((prev) => {
        const next = { ...prev };
        const set = new Set(next[captureId] ?? []);
        set.add(catalogId);
        next[captureId] = set;
        return next;
      });
      setSuggestionIndex(0);
      const undo = () => {
        setDismissed((prev) => {
          const next = { ...prev };
          const set = new Set(next[captureId] ?? []);
          set.delete(catalogId);
          next[captureId] = set;
          return next;
        });
      };
      toast.custom(
        (t) => (
          <div
            className="flex w-[460px] items-center gap-3 rounded-md px-4 py-3 shadow-lg"
            style={{ background: "#D6F0FA", color: "#1c2127" }}
          >
            <CheckCircleIcon className="h-7 w-7 shrink-0" style={{ color: "#3BB6E9" }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight">Suggestion dismissed</div>
              <div className="mt-0.5 text-sm leading-tight" style={{ color: "#3a4148" }}>
                {item ? `${item.manufacturer} ${item.model} removed from suggestions` : "Removed"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                undo();
                toast.dismiss(t);
              }}
              className="shrink-0 rounded px-2 py-1 text-sm font-medium transition hover:bg-black/5"
              style={{ color: "#3BB6E9" }}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => toast.dismiss(t)}
              aria-label="Close"
              className="shrink-0 rounded p-1 transition hover:bg-black/5"
              style={{ color: "#3BB6E9" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ),
        { duration: 5000 },
      );
    },
    [current],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      if (done) return;

      // Global
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        addAsNew();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (allApproved) {
          setPendingBindId(selected?.item.id ?? null);
        } else {
          setStatus("approved");
        }
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setStatus("rejected");
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (captureCount > 0) setCaptureIndex((i) => (i - 1 + captureCount) % captureCount);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (captureCount > 0) setCaptureIndex((i) => (i + 1) % captureCount);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (suggestionCount > 0) {
          setSuggestionIndex((i) => (i - 1 + suggestionCount) % suggestionCount);
          setCaptureIndex(0);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (suggestionCount > 0) {
          setSuggestionIndex((i) => (i + 1) % suggestionCount);
          setCaptureIndex(0);
        }
        return;
      }
      if (e.key === "Delete") {
        e.preventDefault();
        if (selected) dismissSuggestion(selected.item.id);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        searchCatalog();
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        skipSession();
        return;
      }
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        markUnrecognized();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    addAsNew,
    allApproved,
    captureCount,
    dismissSuggestion,
    done,
    markUnrecognized,
    searchCatalog,
    selected,
    setStatus,
    skipSession,
    suggestionCount,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-medium" style={{ color: "rgba(255,255,255,0.87)" }}>
            Session Review
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/out-of-catalog" })}
          aria-label="Close review session"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {done ? (
        <SessionComplete
          decisions={decisions}
          total={total}
          onBack={() => navigate({ to: "/out-of-catalog" })}
        />
      ) : current ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Suggestion ID chip */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-3">
            {selected ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex min-w-0 max-w-full items-center gap-3 rounded-md border border-border bg-surface px-3 py-1.5">
                  <span
                    className="shrink-0 font-mono text-xs text-foreground/80"
                    title={currentCapture?.id ?? ""}
                  >
                    #{currentCapture?.id ?? "—"}
                  </span>
                  <span className="h-3 w-px shrink-0 bg-white/10" />

                  <MetaField label="Type" value={current.aiType || "—"} />
                  <span className="h-3 w-px shrink-0 bg-white/10" />
                  <MetaField label="Manufacturer" value={current.aiManufacturer || "—"} />
                  <span className="h-3 w-px shrink-0 bg-white/10" />
                  <MetaField label="Model" value={current.aiModel || "—"} />
                  {currentCapture?.aiDescription && (
                    <>
                      <span className="h-3 w-px shrink-0 bg-white/10" />
                      <MetaField
                        label="Panel description"
                        value={currentCapture.aiDescription}
                        truncate
                      />
                    </>
                  )}
                  <MatchScoreBadge score={selected.score} />
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {safeSuggestionIdx + 1} / {suggestionCount}
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No suggestions remaining</div>
            )}
          </div>

          {/* Compare images + vertical suggestion rail */}
          <section
            className="grid min-h-0 flex-1 gap-3 px-6 pt-3 pb-3"
            style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 280px" }}
          >
            <CaptureImagePanel
              src={currentCapture?.imageUrl}
              status={currentCapture ? statusFor(currentCapture.id) : "pending"}
              metaBottomLeft={
                currentCapture
                  ? `${currentCapture.capturedAt} · ${currentCapture.location}`
                  : undefined
              }
              onApprove={() => setStatus("approved")}
              onReject={() => setStatus("rejected")}
              canAct={!!currentCapture && !!selected}
              captureKey={currentCapture?.id ?? ""}
            />
            <ImagePanel
              label="Catalog reference"
              src={selected?.item.referenceImageUrl}
              empty="No suggestion"
            />
            {/* Vertical suggestion rail */}
            <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
                <span className="text-xs text-muted-foreground">
                  AI suggested matches
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {suggestionCount > 0 ? `${safeSuggestionIdx + 1} / ${suggestionCount}` : "0 / 0"}
                </span>
              </div>
              {suggestionCount === 0 ? (
                <div className="m-3 rounded-md border border-dashed border-border bg-background/40 px-3 py-6 text-center text-xs text-muted-foreground">
                  All suggestions dismissed — use{" "}
                  <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px]">Ctrl+Enter</kbd>{" "}
                  to add as new.
                </div>
              ) : (
                <div className="ooc-scroll flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {suggestions.map((s, i) => {
                    const active = i === safeSuggestionIdx;
                    const label = `${s.item.manufacturer} ${s.item.model}`;
                    return (
                      <div
                        key={s.item.id}
                        className={`relative shrink-0 overflow-hidden rounded-md border bg-background/40 transition ${
                          active
                            ? "border-transparent ring-2 ring-[#3BB6E9]"
                            : "border-border opacity-80 hover:opacity-100"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSuggestionIndex(i)}
                          className="block w-full text-left"
                        >
                          <div className="h-[88px] w-full overflow-hidden bg-black/30">
                            <img
                              src={s.item.referenceImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col gap-1 px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="font-mono text-[10px] text-muted-foreground"
                                title={s.item.id}
                              >
                                #{s.item.id}
                              </span>
                              <MatchScoreBadge score={s.score} />
                            </div>
                            <div
                              className="truncate text-xs font-medium text-foreground"
                              title={label}
                            >
                              {label}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissSuggestion(s.item.id)}
                          aria-label="Dismiss suggestion"
                          title="Dismiss"
                          className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-[color:var(--color-danger,#d97a72)] backdrop-blur transition hover:bg-black/70"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Capture strip */}
          <div className="shrink-0 border-t border-border px-6 pt-3">
            <div className="flex items-center justify-between pb-1.5">
              <div className="text-xs text-muted-foreground">
                Captured images
              </div>


            </div>
            <div className="ooc-scroll flex gap-2 overflow-x-auto px-1 pb-2 pt-1">
              {captures.map((cap, i) => {
                const status = statusFor(cap.id);
                const active = i === safeCaptureIdx;
                return (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => setCaptureIndex(i)}
                    className={`group relative h-[72px] w-[108px] shrink-0 overflow-hidden rounded-md border border-border transition ${
                      active
                        ? "ring-2 ring-[#3BB6E9] ring-offset-2 ring-offset-background"
                        : "opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img src={cap.imageUrl} alt="" className="h-full w-full object-cover" />

                    {/* Approved: strong green overlay + big check */}
                    {status === "approved" && (
                      <>
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{ background: "rgba(143,211,168,0.55)" }}
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <Check
                            className="h-9 w-9"
                            strokeWidth={4}
                            style={{ color: "#0F2A1C", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                          />
                        </div>
                      </>
                    )}

                    {/* Rejected: red overlay */}
                    {status === "rejected" && (
                      <>
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{ background: "rgba(217,122,114,0.45)" }}
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <X
                            className="h-8 w-8"
                            strokeWidth={4}
                            style={{ color: "#2a0e0d", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                          />
                        </div>
                      </>
                    )}

                    {/* Pending dot indicator */}
                    {status === "pending" && (
                      <span
                        className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full"
                        style={{ background: "rgba(255,255,255,0.55)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

          </div>


          {/* Shortcut bar */}
          <ShortcutBar
            allApproved={allApproved}
            canBind={!!selected && allApproved}
            onBind={() => selected && setPendingBindId(selected.item.id)}
          />
        </div>
      ) : (
        <EmptyQueue onBack={() => navigate({ to: "/out-of-catalog" })} />
      )}

      <AlertDialog
        open={pendingBindId !== null}
        onOpenChange={(o) => !o && setPendingBindId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm bind to catalog item?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const it = mockCatalog.find((c) => c.id === pendingBindId);
                return it
                  ? `This will bind ${current?.instances ?? 0} instance(s) to ${it.manufacturer} · ${it.model}.`
                  : "This will bind the current object to the selected catalog item.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPendingBindId(null);
                confirmBind();
              }}
              className="bg-brand text-background hover:bg-brand/90"
            >
              Confirm &amp; Bind
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}

function MetaField({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <span
      className={`flex min-w-0 items-baseline gap-1.5 ${truncate ? "min-w-0" : "shrink-0"}`}
      title={value}
    >
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-medium text-foreground ${truncate ? "max-w-[280px] truncate" : "shrink-0"}`}
      >
        {value}
      </span>
    </span>
  );
}



function ImagePanel({
  label,
  src,
  empty,
  status,
  metaTopLeft,
  onApprove,
  onReject,
  canAct,
}: {
  label: string;
  src?: string;
  empty: string;
  status?: ImgStatus;
  metaTopLeft?: string;
  onApprove?: () => void;
  onReject?: () => void;
  canAct?: boolean;
}) {
  return (
    <div className="relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {status && (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
            style={
              status === "approved"
                ? { background: "rgba(59,182,233,0.15)", color: "#3BB6E9" }
                : status === "rejected"
                  ? { background: "rgba(217,122,114,0.15)", color: "#d97a72" }
                  : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }
            }
          >
            {status}
          </span>
        )}
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/30">
        {src ? (
          <img src={src} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="text-sm text-muted-foreground">{empty}</div>
        )}
        {metaTopLeft && (
          <div className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 text-[11px] text-white/85 backdrop-blur">
            {metaTopLeft}
          </div>
        )}
        {onApprove && onReject && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={onReject}
              disabled={!canAct}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-black/55 px-2.5 text-xs backdrop-blur transition hover:bg-black/70 disabled:opacity-40"
              style={{ color: "#d97a72" }}
              title="Reject (Backspace)"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={!canAct}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium shadow-sm backdrop-blur transition disabled:opacity-40"
              style={{
                background: "#8FD3A8",
                borderColor: "#8FD3A8",
                color: "#0F2A1C",
              }}
              title="Approve (Enter)"
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
      {children}
    </kbd>
  );
}

function ShortcutGroup({
  label,
  items,
}: {
  label: string;
  items: Array<{ keys: React.ReactNode; action: string }>;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground/70">{label}</span>
      <div className="flex items-center gap-3">
        {items.map((it, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">{it.keys}</span>
            <span>{it.action}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ShortcutBar({
  allApproved,
  canBind,
  onBind,
}: {
  allApproved: boolean;
  canBind: boolean;
  onBind: () => void;
}) {
  return (
    <div className="mt-auto flex shrink-0 items-center justify-between gap-4 border-t border-border bg-surface px-6 py-2.5">
      <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <ShortcutGroup
          label="Image"
          items={[
            { keys: <Kbd>Enter</Kbd>, action: allApproved ? "Bind" : "Approve" },
            { keys: <Kbd>⌫</Kbd>, action: "Reject" },
            {
              keys: (
                <>
                  <Kbd>←</Kbd>
                  <Kbd>→</Kbd>
                </>
              ),
              action: "Prev/Next image",
            },
          ]}
        />
        <span className="h-4 w-px bg-white/10" />
        <ShortcutGroup
          label="Suggestion"
          items={[
            {
              keys: (
                <>
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                </>
              ),
              action: "Prev/Next",
            },
            { keys: <Kbd>Del</Kbd>, action: "Dismiss" },
            {
              keys: (
                <>
                  <Kbd>F</Kbd>
                  <Search className="h-3 w-3 text-muted-foreground" />
                </>
              ),
              action: "Search catalog",
            },
          ]}
        />
        <span className="h-4 w-px bg-white/10" />
        <ShortcutGroup
          label="Global"
          items={[
            {
              keys: (
                <>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Enter</Kbd>
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </>
              ),
              action: "Add as new",
            },
            {
              keys: (
                <>
                  <Kbd>S</Kbd>
                  <SkipForward className="h-3 w-3 text-muted-foreground" />
                </>
              ),
              action: "Skip session",
            },
            { keys: <Kbd>U</Kbd>, action: "Unrecognize" },
          ]}
        />
      </div>
      <button
        type="button"
        onClick={onBind}
        disabled={!canBind}
        className="inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "#3BB6E9", color: "#0b1418" }}
        title={canBind ? "Bind (Enter)" : "Approve all captured images first"}
      >
        <Check className="h-4 w-4" />
        Bind
      </button>
    </div>
  );
}

type Pt = { x: number; y: number };
const DEFAULT_POLY: Pt[] = [
  { x: 28, y: 36 },
  { x: 72, y: 36 },
  { x: 74, y: 66 },
  { x: 26, y: 66 },
];

function CaptureImagePanel({
  src,
  status,
  metaBottomLeft,
  onApprove,
  onReject,
  canAct,
  captureKey,
}: {
  src?: string;
  status?: ImgStatus;
  metaBottomLeft?: string;
  onApprove?: () => void;
  onReject?: () => void;
  canAct?: boolean;
  captureKey: string;
}) {
  const [editing, setEditing] = useState(false);
  const [poly, setPoly] = useState<Pt[]>(DEFAULT_POLY);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Reset polygon when capture changes
  useEffect(() => {
    setPoly(DEFAULT_POLY);
    setEditing(false);
  }, [captureKey]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragIdx === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));
    setPoly((prev) => prev.map((p, i) => (i === dragIdx ? { x, y } : p)));
  };

  const points = poly.map((p) => `${p.x},${p.y}`).join(" ");

  const confirmCrop = () => {
    setEditing(false);
    toast.message("Re-running AI search with new crop");
  };

  return (
    <div className="relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Captured image</span>
        {status && (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
            style={
              status === "approved"
                ? { background: "rgba(59,182,233,0.15)", color: "#3BB6E9" }
                : status === "rejected"
                  ? { background: "rgba(217,122,114,0.15)", color: "#d97a72" }
                  : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }
            }
          >
            {status}
          </span>
        )}
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/30"
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragIdx(null)}
        onPointerLeave={() => setDragIdx(null)}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            style={{ transform: "scale(1.7)", transformOrigin: "50% 48%" }}
            draggable={false}
          />
        ) : (
          <div className="text-sm text-muted-foreground">No capture</div>
        )}

        {/* Polygon overlay */}
        {src && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon
              points={points}
              fill="none"
              stroke="rgba(0,0,0,0.85)"
              strokeWidth="0.9"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 4 } as React.CSSProperties}
            />
            <polygon
              points={points}
              fill="rgba(59,182,233,0.08)"
              stroke="#3BB6E9"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 2 } as React.CSSProperties}
            />
          </svg>
        )}

        {/* Polygon handles (editable) */}
        {src && editing && (
          <div className="absolute inset-0">
            {poly.map((p, i) => (
              <div
                key={i}
                onPointerDown={(e) => {
                  e.preventDefault();
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  setDragIdx(i);
                }}
                className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-[#3BB6E9] bg-background shadow active:cursor-grabbing"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              />
            ))}
          </div>
        )}

        {/* Metadata — flush bottom-left of image, above the strip */}
        {metaBottomLeft && !editing && (
          <div className="absolute bottom-0 left-0 bg-black/55 px-2 py-1 text-[11px] text-white/85 backdrop-blur">
            {metaBottomLeft}
          </div>
        )}
      </div>

      {/* Bottom black strip: crop (left) + reject/approve (right) */}
      {src && (
        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-black px-2 py-1.5">
          <button
            type="button"
            onClick={() => (editing ? confirmCrop() : setEditing(true))}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs transition hover:bg-white/5"
            style={{ color: editing ? "#8FBFA3" : "#ffffff" }}
            title={editing ? "Confirm crop (re-run AI)" : "Edit crop"}
          >
            {editing ? (
              <>
                <Check className="h-3.5 w-3.5" /> Done
              </>
            ) : (
              <Crop className="h-3.5 w-3.5" />
            )}
          </button>

          {onApprove && onReject && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onReject}
                disabled={!canAct}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs transition hover:bg-white/5 disabled:opacity-40"
                style={{ color: "#d97a72", border: "2px solid #d97a72" }}
                title="Reject (Backspace)"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>

              <button
                type="button"
                onClick={onApprove}
                disabled={!canAct}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition disabled:opacity-40"
                style={{
                  background: "#8FD3A8",
                  color: "#0F2A1C",
                }}
                title="Approve (Enter)"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Approve
              </button>

            </div>
          )}
        </div>
      )}
    </div>
  );
}


function MatchScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80
      ? { bg: "rgba(150,200,170,0.10)", fg: "#8FBFA3" }
      : score >= 50
        ? { bg: "rgba(220,190,140,0.10)", fg: "#C9B07A" }
        : { bg: "rgba(220,150,150,0.10)", fg: "#C98A8A" };
  return (
    <span
      className="ml-1 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {score}%
    </span>
  );
}

function SessionComplete({
  decisions,
  total,
  onBack,
}: {
  decisions: Record<string, Decision>;
  total: number;
  onBack: () => void;
}) {
  const counts = Object.values(decisions).reduce(
    (acc, d) => {
      acc[d] = (acc[d] ?? 0) + 1;
      return acc;
    },
    {} as Record<Decision, number>,
  );

  const stat = (label: string, n: number, color: string) => (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-medium tabular-nums" style={{ color }}>
        {n}
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface p-8">
        <div className="text-xs text-muted-foreground">
          Session complete
        </div>
        <h1 className="mt-2 text-2xl font-medium text-foreground">
          You reviewed {total} pending {total === 1 ? "object" : "objects"}.
        </h1>

        <div className="mt-6 grid grid-cols-4 gap-3">
          {stat("Bound", counts.bound ?? 0, "#3BB6E9")}
          {stat("Added", counts.added ?? 0, "#8FBFA3")}
          {stat("Skipped", counts.skipped ?? 0, "rgba(255,255,255,0.8)")}
          {stat("Unrecognized", counts.unrecognized ?? 0, "#C98A8A")}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-background hover:bg-brand/90"
          >
            Back to list
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyQueue({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <h1 className="text-xl font-medium text-foreground">Nothing to review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There are no Pending objects in the queue.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-background hover:bg-brand/90"
        >
          Back to list
        </button>
      </div>
    </div>
  );
}
