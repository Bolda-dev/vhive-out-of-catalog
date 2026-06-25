import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crop,
  HelpCircle,
  Plus,
  RotateCcw,
  Search,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";



import { appToast } from "@/components/ui/app-toast";
import { ConfidenceBadge } from "@/components/out-of-catalog/ConfidenceBadge";
import { mockOutOfCatalog } from "@/data/mockOutOfCatalog";
import { mockCatalog } from "@/data/mockCatalog";
import { Toaster } from "@/components/ui/sonner";
import { AddNewBindIcon, MarkUnrecognizedIcon } from "@/components/out-of-catalog/RowActions";
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
  const [bindAnim, setBindAnim] = useState<{ label: string } | null>(null);

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
    const label = `${selected.item.manufacturer} ${selected.item.model}`;
    playBindSound();
    setBindAnim({ label });
    window.setTimeout(() => {
      setDecisions((prev) => ({ ...prev, [current.id]: "bound" }));
      appToast({ variant: "success", title: "Bound to catalog item", description: label });
      setBindAnim(null);
      goNext();
    }, 1100);
  }, [current, selected, goNext]);

  const skipSession = useCallback(() => {
    navigate({ to: "/out-of-catalog" });
  }, [navigate]);

  const markUnrecognized = useCallback(() => {
    if (!current) return;
    setDecisions((prev) => ({ ...prev, [current.id]: "unrecognized" }));
    appToast({ title: "Marked as Unrecognized" });
    goNext();
  }, [current, goNext]);

  const addAsNew = useCallback(() => {
    if (!current) return;
    setDecisions((prev) => ({ ...prev, [current.id]: "added" }));
    appToast({ variant: "success", title: "Added as new equipment" });
    goNext();
  }, [current, goNext]);

  const searchCatalog = useCallback(() => appToast({ title: "Catalog search — coming soon" }), []);

  const recreateSuggestions = useCallback(() => {
    if (!current) return;
    setDismissed((prev) => {
      const next = { ...prev };
      delete next[current.id];
      return next;
    });
    setSuggestionIndex(0);
    appToast({ variant: "success", title: "AI suggestions restored" });
  }, [current]);

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
      appToast({
        title: "Suggestion dismissed",
        description: item ? `${item.manufacturer} ${item.model} removed from suggestions` : "Removed",
        duration: 5000,
        action: { label: "Undo", onClick: undo },
      });
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
            style={{
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            }}
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

            {/* Combined Catalog reference + AI suggestions card */}
            <div className="flex min-h-0 overflow-hidden rounded-lg border border-border bg-surface">
              {/* Left: catalog reference */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-8 shrink-0 items-center border-b border-border/60 px-3">
                  <span className="text-xs text-muted-foreground">Catalog reference</span>
                </div>
                <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/30">
                  {selected?.item.referenceImageUrl ? (
                    <img
                      src={selected.item.referenceImageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">No suggestion</div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px shrink-0 bg-border/60" />

              {/* Right: suggestions / empty state */}
              {suggestionCount === 0 ? (
                <div className="flex w-[300px] shrink-0 min-h-0 flex-col">
                  <NoSuggestionsEmpty
                    onAddAsNew={addAsNew}
                    onUnrecognize={markUnrecognized}
                    onSearch={searchCatalog}
                    onRecreate={recreateSuggestions}
                    canRecreate={(dismissed[current.id]?.size ?? 0) > 0}
                  />
                </div>
              ) : (
                <div className="flex w-[280px] shrink-0 min-h-0 flex-col">
                  <div className="flex h-8 shrink-0 items-center justify-between border-b border-border/60 px-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: "#3BB6E9" }} />
                      AI suggested matches
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {`${safeSuggestionIdx + 1} / ${suggestionCount}`}
                    </span>
                  </div>
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
            <div className="ooc-scroll flex gap-2 overflow-x-auto px-1 pb-4 pt-1">
              {captures.map((cap, i) => {
                const status = statusFor(cap.id);
                const active = i === safeCaptureIdx;
                return (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => setCaptureIndex(i)}
                    className={`group relative h-[72px] w-[108px] shrink-0 overflow-hidden rounded-md border-2 transition ${
                      active
                        ? "ring-2 ring-[#3BB6E9] ring-offset-2 ring-offset-background"
                        : "opacity-90 hover:opacity-100"
                    }`}
                    style={{
                      borderColor:
                        status === "approved"
                          ? "#8FD3A8"
                          : status === "rejected"
                          ? "#d97a72"
                          : "hsl(var(--border))",
                    }}
                  >
                    <img src={cap.imageUrl} alt="" className="h-full w-full object-cover" />

                    {/* Approved: green circle badge top-right */}
                    {status === "approved" && (
                      <span
                        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full"
                        style={{ background: "#8FD3A8", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3.5} style={{ color: "#ffffff" }} />
                      </span>
                    )}

                    {/* Rejected: red circle badge top-right */}
                    {status === "rejected" && (
                      <span
                        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full"
                        style={{ background: "#d97a72", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={3.5} style={{ color: "#ffffff" }} />
                      </span>
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
            onUnrecognize={markUnrecognized}
            onAddAsNew={addAsNew}
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

      {bindAnim && <BindBurst label={bindAnim.label} />}

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
    <div className="flex shrink-0 items-center gap-2">
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
  onUnrecognize,
  onAddAsNew,
}: {
  allApproved: boolean;
  canBind: boolean;
  onBind: () => void;
  onUnrecognize: () => void;
  onAddAsNew: () => void;
}) {
  return (
    <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-border bg-surface px-6 py-2.5">
      <div className="flex shrink-0 items-center justify-end gap-2">
        <button
          type="button"
          onClick={onUnrecognize}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-transparent px-3 text-sm font-normal text-foreground/85 transition hover:bg-white/5"
          title="Unrecognize (U)"
        >
          <MarkUnrecognizedIcon className="h-4 w-4" />
          Unrecognize
        </button>
        <button
          type="button"
          onClick={onAddAsNew}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-transparent px-3 text-sm font-normal text-foreground/85 transition hover:bg-white/5"
          title="Add as new (Ctrl+Enter)"
        >
          <AddNewBindIcon className="h-4 w-4" />
          New equipment
        </button>
        <button
          type="button"
          onClick={onBind}
          disabled={!canBind}
          className="inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "#3BB6E9", color: "#0b1418" }}
          title={canBind ? "Bind (Enter)" : "Approve all captured images first"}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M11.1818 0C8.16121 0 5.59353 1.97466 4.70067 4.70067C1.97466 5.59353 0 8.16121 0 11.1818C0 14.9414 3.05863 18 6.81817 18C9.83879 18 12.4065 16.0253 13.2993 13.2993C16.0253 12.4065 18 9.83879 18 6.81817C18 3.05863 14.9414 0 11.1818 0ZM6.81817 16.3637C3.96091 16.3637 1.63635 14.0391 1.63635 11.1818C1.63635 9.21076 2.74264 7.49341 4.36679 6.61757C4.36489 6.68422 4.36363 6.75109 4.36363 6.81817C4.36363 10.5777 7.42226 13.6363 11.1818 13.6363C11.2489 13.6363 11.3157 13.6351 11.3824 13.6332C10.5066 15.2574 8.78924 16.3637 6.81817 16.3637ZM13.6332 11.3824C13.6351 11.3158 13.6364 11.2489 13.6364 11.1818C13.6364 7.42229 10.5777 4.36366 6.8182 4.36366C6.75112 4.36366 6.68426 4.36493 6.6176 4.36683C7.49345 2.74268 9.2108 1.63638 11.1819 1.63638C14.0391 1.63638 16.3637 3.96095 16.3637 6.8182C16.3637 8.78924 15.2574 10.5066 13.6332 11.3824Z" fill="currentColor" />
          </svg>
          Bind
        </button>
      </div>
      <ShortcutsScroller>
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
        <span className="h-4 w-px shrink-0 bg-white/10" />
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
        <span className="h-4 w-px shrink-0 bg-white/10" />
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
      </ShortcutsScroller>
    </div>
  );
}

function ShortcutsScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollBy = (dx: number) => {
    ref.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  const showArrows = canLeft || canRight;

  return (
    <div className="relative flex items-center border-t border-border/50 pt-2">
      {showArrows && (
        <button
          type="button"
          onClick={() => scrollBy(-200)}
          disabled={!canLeft}
          aria-label="Scroll shortcuts left"
          className="z-10 mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground/70 transition hover:bg-white/5 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div
        ref={ref}
        className="flex flex-1 items-center gap-x-5 overflow-x-auto whitespace-nowrap scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
      {showArrows && (
        <button
          type="button"
          onClick={() => scrollBy(200)}
          disabled={!canRight}
          aria-label="Scroll shortcuts right"
          className="z-10 ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground/70 transition hover:bg-white/5 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
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
    appToast({ title: "Re-running AI search with new crop" });
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

        {/* Crop button — overlay above metadata */}
        {src && (
          <button
            type="button"
            onClick={() => (editing ? confirmCrop() : setEditing(true))}
            className="absolute bottom-9 left-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/70"
            style={editing ? { color: "#8FBFA3", borderColor: "#8FBFA3" } : undefined}
            title={editing ? "Confirm crop (re-run AI)" : "Edit crop"}
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <Crop className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Metadata — flush bottom-left of image, above the strip */}
        {metaBottomLeft && !editing && (
          <div className="absolute bottom-0 left-0 bg-black/55 px-2 py-1 text-[11px] text-white/85 backdrop-blur">
            {metaBottomLeft}
          </div>
        )}
      </div>

      {/* Bottom black strip: reject/approve */}
      {src && onApprove && onReject && (
        <div className="flex items-center justify-end gap-1.5 border-t border-border/60 bg-black px-2 py-1.5">
          <button
            type="button"
            onClick={onReject}
            disabled={!canAct}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs transition hover:bg-white/5 disabled:opacity-40"
            style={{ color: "#d97a72", border: "1px solid #d97a72" }}
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

// ---------- Bind sound (Web Audio) ----------
function playBindSound() {
  try {
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const tones = [
      { f: 660, t: 0.0 },
      { f: 880, t: 0.12 },
      { f: 1320, t: 0.26 },
    ];
    tones.forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.25);
    });
    window.setTimeout(() => ctx.close(), 900);
  } catch {
    /* ignore */
  }
}

// ---------- Bind success animation overlay ----------
function BindBurst({ label }: { label: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <style>{`
        @keyframes bb-left { 0%{transform:translateX(-180px) scale(.9);opacity:0} 30%{opacity:1} 60%{transform:translateX(-6px) scale(1)} 100%{transform:translateX(-6px) scale(1)} }
        @keyframes bb-right { 0%{transform:translateX(180px) scale(.9);opacity:0} 30%{opacity:1} 60%{transform:translateX(6px) scale(1)} 100%{transform:translateX(6px) scale(1)} }
        @keyframes bb-merge { 0%,55%{opacity:0;transform:scale(.4)} 70%{opacity:1;transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }
        @keyframes bb-ring { 0%,55%{opacity:0;transform:scale(.4)} 60%{opacity:.9;transform:scale(.6)} 100%{opacity:0;transform:scale(2.4)} }
        @keyframes bb-label { 0%,60%{opacity:0;transform:translateY(6px)} 100%{opacity:1;transform:translateY(0)} }
      `}</style>
      <div className="relative flex flex-col items-center">
        <div className="relative h-[120px] w-[260px]">
          {/* Left circle (capture / camera) */}
          <div
            className="absolute left-1/2 top-1/2 h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg"
            style={{
              background: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.6)",
              animation: "bb-left 700ms cubic-bezier(.22,1,.36,1) forwards",
            }}
          />
          {/* Right circle (catalog / brand) */}
          <div
            className="absolute left-1/2 top-1/2 h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg"
            style={{
              background: "rgba(59,182,233,0.18)",
              borderColor: "#3BB6E9",
              animation: "bb-right 700ms cubic-bezier(.22,1,.36,1) forwards",
            }}
          />
          {/* Merge burst */}
          <div
            className="absolute left-1/2 top-1/2 flex h-[96px] w-[96px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
            style={{
              background: "#3BB6E9",
              color: "#06222e",
              boxShadow: "0 0 40px rgba(59,182,233,0.65)",
              animation: "bb-merge 900ms cubic-bezier(.22,1,.36,1) forwards",
            }}
          >
            <Check className="h-12 w-12" strokeWidth={3.5} />
          </div>
          {/* Outward ring */}
          <div
            className="absolute left-1/2 top-1/2 h-[96px] w-[96px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              border: "2px solid #3BB6E9",
              animation: "bb-ring 900ms ease-out forwards",
            }}
          />
        </div>
        <div
          className="mt-4 text-sm font-medium text-white"
          style={{ animation: "bb-label 900ms ease-out forwards", opacity: 0 }}
        >
          Bound to <span style={{ color: "#3BB6E9" }}>{label}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Empty state: no AI suggestions ----------
function NoSuggestionsEmpty({
  onAddAsNew,
  onUnrecognize,
  onSearch,
  onRecreate,
  canRecreate,
}: {
  onAddAsNew: () => void;
  onUnrecognize: () => void;
  onSearch: () => void;
  onRecreate: () => void;
  canRecreate: boolean;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch overflow-y-auto p-4">
      <div className="flex flex-col items-center">
        <div className="relative mb-3 flex h-14 w-14 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(59,182,233,0.18), transparent 70%)" }}
          />
          <Sparkles className="h-7 w-7" style={{ color: "#3BB6E9" }} />
        </div>
        <h2 className="text-sm font-medium text-foreground">No more AI suggestions</h2>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Pick what fits best for this capture.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <EmptyAction
          onClick={onAddAsNew}
          icon={<AddNewBindIcon className="h-5 w-5" />}
          title="Add as new equipment"
          subtitle="Create a fresh catalog entry"
          shortcut={
            <>
              <Kbd>Ctrl</Kbd>
              <Kbd>Enter</Kbd>
            </>
          }
          primary
        />
        <EmptyAction
          onClick={onSearch}
          icon={<Search className="h-5 w-5" style={{ color: "#3BB6E9" }} />}
          title="Search the catalog"
          subtitle="Find a match manually"
          shortcut={<Kbd>F</Kbd>}
        />
        <EmptyAction
          onClick={onUnrecognize}
          icon={<MarkUnrecognizedIcon className="h-5 w-5" />}
          title="Mark as unrecognized"
          subtitle="Send for human review"
          shortcut={<Kbd>U</Kbd>}
        />
      </div>

      <button
        type="button"
        onClick={onRecreate}
        disabled={!canRecreate}
        className="mt-4 inline-flex items-center justify-center gap-2 self-center rounded-md border border-border bg-transparent px-3 py-1.5 text-xs text-foreground/80 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
        title={canRecreate ? "Bring back dismissed suggestions" : "Nothing to recreate"}
      >
        <RotateCcw className="h-3.5 w-3.5" style={{ color: "#3BB6E9" }} />
        Recreate AI suggestions
      </button>
    </div>
  );
}


function EmptyAction({
  onClick,
  icon,
  title,
  subtitle,
  shortcut,
  primary,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  shortcut: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg border bg-background/40 px-3 py-2.5 text-left transition hover:bg-background/70"
      style={{
        borderColor: primary ? "#3BB6E9" : "rgba(255,255,255,0.12)",
        boxShadow: primary ? "0 0 0 1px rgba(59,182,233,0.25)" : undefined,
      }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/[0.04]">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">{shortcut}</div>
    </button>
  );
}

