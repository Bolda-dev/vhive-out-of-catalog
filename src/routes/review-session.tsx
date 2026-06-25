import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,

  Calendar,
  Check,
  Crop,
  Images,


  MapPin,
  Plus,
  Search,
  SkipForward,
  Sparkles,
  X,

} from "lucide-react";
import { toast } from "sonner";
import { AddNewBindIcon, BindToExistingIcon, MarkUnrecognizedIcon } from "@/components/out-of-catalog/RowActions";


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
          "Review pending out-of-catalog detections one by one and bind, skip, or add them.",
      },
    ],
  }),
  component: ReviewSessionPage,
});

type Decision = "bound" | "skipped" | "unrecognized" | "added";

const pending = mockOutOfCatalog.filter((r) => r.status === "Pending");

function stableBoundCount(id: string) {
  // deterministic pseudo-counter so mock catalog "N bound" is stable per id
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 40) + 2;
}

function ReviewSessionPage() {
  const navigate = useNavigate();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [aiEdits, setAiEdits] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<Record<string, Set<string>>>({});
  const DEFAULT_POLY: Array<{ x: number; y: number }> = [
    { x: 18, y: 30 },
    { x: 82, y: 30 },
    { x: 82, y: 44 },
    { x: 18, y: 44 },
  ];
  const [polygons, setPolygons] = useState<Record<string, Array<{ x: number; y: number }>>>({});
  const [polyEditing, setPolyEditing] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const [pendingBindId, setPendingBindId] = useState<string | null>(null);


  const [banner, setBanner] = useState<
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);

  const queue = useMemo<OocRow[]>(() => {
    const sorted = [...pending].sort((a, b) => a.confidence - b.confidence);
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [sortDir]);

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
  const safeIndex = suggestionCount > 0 ? Math.min(suggestionIndex, suggestionCount - 1) : 0;
  const selected = suggestionCount > 0 ? suggestions[safeIndex]! : null;
  const suggestion = selected ? selected.item : null;

  const goNext = useCallback(() => {
    setCaptureIndex(0);
    setSuggestionIndex(0);
    setBanner(null);
    setCurrentIndex((i) => Math.min(i + 1, total));
  }, [total]);
  const goPrev = useCallback(() => {
    setCaptureIndex(0);
    setSuggestionIndex(0);
    setBanner(null);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const record = useCallback(
    (d: Decision, msg: string) => {
      if (!current) return;
      setDecisions((prev) => ({ ...prev, [current.id]: d }));
      toast.success(msg);
      goNext();
    },
    [current, goNext],
  );

  const confirmBind = useCallback(() => {
    if (!current || !selected) return;
    setDecisions((prev) => ({ ...prev, [current.id]: "bound" }));
    setBanner({
      kind: "success",
      message: `New equipment bound successfully — ${selected.item.manufacturer} ${selected.item.model}`,
    });
    window.setTimeout(() => {
      setBanner(null);
      setCaptureIndex(0);
      setSuggestionIndex(0);
      setCurrentIndex((i) => Math.min(i + 1, total));
    }, 900);
  }, [current, selected, total]);
  const simulateBindError = useCallback(() => {
    setBanner({
      kind: "error",
      message: "Failed to bind equipment — please try again",
    });
  }, []);
  const skip = useCallback(() => record("skipped", "Skipped"), [record]);
  const markUnrecognized = useCallback(
    () => record("unrecognized", "Marked as Unrecognized"),
    [record],
  );
  const addAsNew = useCallback(
    () => record("added", "Added as new equipment"),
    [record],
  );
  const searchCatalog = useCallback(
    () => toast.message("Catalog search — coming soon"),
    [],
  );
  const dismissSuggestion = useCallback(
    (catalogId: string) => {
      if (!current) return;
      const item = mockCatalog.find((c) => c.id === catalogId);
      setDismissed((prev) => {
        const next = { ...prev };
        const set = new Set(next[current.id] ?? []);
        set.add(catalogId);
        next[current.id] = set;
        return next;
      });
      setSuggestionIndex(0);
      toast.success("Suggestion dismissed", {
        description: item ? `${item.manufacturer} · ${item.model} removed from suggestions` : undefined,
      });
    },
    [current],
  );


  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (done) return;
      if (e.key === "Enter") {
        e.preventDefault();
        confirmBind();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        skip();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmBind, skip, goPrev, goNext, done]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
        <h1 className="text-base font-medium" style={{ color: "rgba(255,255,255,0.87)" }}>
          Session Review
        </h1>
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
          {/* ===== TOP (case) ===== */}
          <section className="flex min-h-0 flex-[3] flex-col gap-3 border-b border-border px-6 pt-4 pb-3">
            {banner && (
              <BindBanner
                banner={banner}
                onDismiss={() => setBanner(null)}
                onSimulateError={simulateBindError}
              />
            )}
            {/* Info card (left) + Rail + Hero */}
            <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_auto] gap-3">
              {/* Info / AI description card */}
              <div className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-col gap-2">
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Type
                  </div>
                  <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.87)" }}>
                    {current.aiType}
                  </div>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex flex-col gap-2">
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Manufacturer
                  </div>
                  <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.87)" }}>
                    {current.aiManufacturer}
                  </div>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex flex-col gap-2">
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Model
                  </div>
                  <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.87)" }}>
                    {current.aiModel}
                  </div>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex flex-col gap-2">
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Confidence
                  </div>
                  <div>
                    <ConfidenceBadge value={current.confidence} size="sm" />
                  </div>
                </div>
                {current.captures[captureIndex] && (
                  <>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        <Sparkles className="h-3 w-3" style={{ color: "#3BB6E9" }} />
                        AI description
                      </div>
                      <span
                        role="textbox"
                        aria-label="AI description (editable)"
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        onBlur={(e) => {
                          const cap = current.captures[captureIndex];
                          if (!cap) return;
                          setAiEdits((prev) => ({ ...prev, [cap.id]: e.currentTarget.textContent ?? "" }));
                        }}
                        title="AI-generated description from the LLM. Click to edit."
                        className="rounded px-1 py-0.5 text-sm italic outline-none cursor-text transition-colors hover:bg-white/[0.06] hover:ring-1 hover:ring-white/15 focus:ring-1 focus:ring-[#3BB6E9]/60"
                        style={{ color: "rgba(255,255,255,0.75)" }}
                      >
                        {aiEdits[current.captures[captureIndex].id] ?? current.captures[captureIndex].aiDescription}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div
                ref={heroRef}
                className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface"
                onPointerMove={(e) => {
                  if (dragIdxRef.current === null || !heroRef.current) return;
                  const rect = heroRef.current.getBoundingClientRect();
                  const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                  const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                  const capId = current.captures[captureIndex]?.id;
                  if (!capId) return;
                  setPolygons((prev) => {
                    const poly = [...(prev[capId] ?? DEFAULT_POLY)];
                    poly[dragIdxRef.current!] = { x, y };
                    return { ...prev, [capId]: poly };
                  });
                }}
                onPointerUp={() => {
                  dragIdxRef.current = null;
                }}
              >
                <img
                  key={current.captures[captureIndex]?.id}
                  src={current.captures[captureIndex]?.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ transform: "scale(1.6)", transformOrigin: "50% 32%" }}
                />
                {current.captures[captureIndex] && (() => {
                  const capId = current.captures[captureIndex].id;
                  const poly = polygons[capId] ?? DEFAULT_POLY;
                  const points = poly.map((p) => `${p.x},${p.y}`).join(" ");
                  return (
                    <>
                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <polygon
                          points={points}
                          fill="#3BB6E9"
                          fillOpacity="0.12"
                          stroke="#000"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                        <polygon
                          points={points}
                          fill="none"
                          stroke="#3BB6E9"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>

                      {polyEditing && (
                        <>
                          {poly.map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              aria-label={`Polygon point ${i + 1}`}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                dragIdxRef.current = i;
                              }}
                              className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-[#3BB6E9] shadow-md active:cursor-grabbing"
                              style={{ left: `${p.x}%`, top: `${p.y}%`, touchAction: "none" }}
                            />
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setPolyEditing((v) => !v)}
                  aria-label={polyEditing ? "Confirm region" : "Edit region"}
                  title={polyEditing ? "Confirm region" : "Edit region"}
                  className={`absolute bottom-12 left-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border shadow-md backdrop-blur-sm transition ${
                    polyEditing
                      ? "border-[#22c55e]/40 bg-[#22c55e] text-white hover:bg-[#16a34a]"
                      : "border-white/10 bg-black/80 text-white hover:bg-black"
                  }`}
                >
                  {polyEditing ? <Check className="h-4 w-4" /> : <Crop className="h-4 w-4" />}
                </button>


                {current.captures[captureIndex] && (
                  <div
                    className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-wrap items-center gap-x-2 gap-y-1 bg-black/60 px-3 py-2 text-xs backdrop-blur-md"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {current.captures[captureIndex].capturedAt}
                    </span>
                    <span className="text-white/30">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {current.captures[captureIndex].location} · survey{" "}
                      {current.captures[captureIndex].surveyId}
                    </span>
                  </div>
                )}
              </div>

              <div className="custom-scrollbar flex w-[128px] flex-col items-center gap-2 overflow-x-hidden overflow-y-auto pl-1 pr-3 py-1">
                {current.captures.map((cap, i) => {
                  const selected = i === captureIndex;
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => setCaptureIndex(i)}
                      className={`group relative h-24 w-24 shrink-0 rounded-md transition ${
                        selected
                          ? "opacity-100 ring-2 ring-offset-2 ring-offset-[#1E1E1E] ring-[#3BB6E9]"
                          : "opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="relative h-full w-full overflow-hidden rounded-md">
                        <img src={cap.imageUrl} alt="" className="h-full w-full object-cover" />
                        {(cap.imageCount ?? 1) > 1 && (
                          <span
                            className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white backdrop-blur-sm"
                            title={`${cap.imageCount} images in this capture`}
                          >
                            <Images className="h-3 w-3" />
                            {cap.imageCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>




          </section>

          {/* ===== BOTTOM (decision) ===== */}
          <section className="flex flex-[2] min-h-0 flex-col">
            <div className="flex flex-1 min-h-0">
              {/* LEFT: AI Suggested Matches */}
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    AI Suggested Matches
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={searchCatalog}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Search catalog manually
                    </button>
                  </div>
                </div>


                {suggestionCount > 0 && selected ? (
                  <div className="grid min-h-0 flex-1 grid-cols-[minmax(340px,400px)_minmax(0,1fr)_auto] gap-4">
                    {/* Candidate cards (left) */}
                    <div className="custom-scrollbar flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
                      {suggestions.map((s, i) => {
                        const active = i === suggestionIndex;
                        return (
                          <div
                            key={s.item.id}
                            className={`relative flex items-stretch rounded-md border transition ${
                              active
                                ? "border-brand bg-brand/10"
                                : "border-border bg-white/[0.02] hover:bg-white/[0.05]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSuggestionIndex(i)}
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-l-md px-3 py-2 text-left"
                            >
                              <img
                                src={s.item.referenceImageUrl}
                                alt=""
                                className="h-12 w-12 shrink-0 rounded border border-border object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-sm font-medium text-foreground">
                                    {s.item.manufacturer} · {s.item.model}
                                  </div>
                                  {active && (
                                    <span className="shrink-0 rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                                      selected
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="truncate text-xs"
                                  style={{ color: "rgba(255,255,255,0.6)" }}
                                >
                                  {s.item.category} / {s.item.classification} · {s.item.heightU}U
                                </div>
                              </div>
                              <MatchScoreBadge score={s.score} />
                            </button>
                            <div className="flex shrink-0 items-center gap-1 border-l border-border/60 px-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSuggestionIndex(i);
                                  setPendingBindId(s.item.id);
                                }}
                                title="Confirm & Bind"
                                aria-label="Confirm and bind"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-brand transition hover:bg-brand/15"
                              >
                                <BindToExistingIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissSuggestion(s.item.id);
                                }}
                                title="Dismiss suggestion"
                                aria-label="Dismiss suggestion"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>


                    {/* Selected reference (right, large) */}
                    <div className="flex min-h-0 flex-col">
                      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-brand/60 bg-surface ring-1 ring-brand/30">
                        <img
                          key={selected.item.id}
                          src={selected.item.referenceImageUrl}
                          alt={`${selected.item.manufacturer} ${selected.item.model}`}
                          className="max-h-full max-w-full object-contain"
                        />

                        <span className="absolute left-2 top-2">
                          <MatchScoreBadge score={selected.score} />
                        </span>
                      </div>
                    </div>

                    {/* Actions (right, minimal width, no border) */}
                    <div className="flex min-h-0 w-44 flex-col gap-2 overflow-auto">
                      <button
                        type="button"
                        onClick={confirmBind}
                        disabled={!selected}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white/[0.04] px-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <BindToExistingIcon className="h-4 w-4 shrink-0" />
                        Confirm &amp; Bind ({current.instances})
                      </button>
                      <button
                        type="button"
                        onClick={addAsNew}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white/[0.04] px-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                      >
                        <AddNewBindIcon className="h-4 w-4 shrink-0" />
                        Add as new
                      </button>
                      <div className="my-1 h-px bg-border" />
                      <button
                        type="button"
                        onClick={skip}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/[0.04] px-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                      >
                        <SkipForward className="h-4 w-4" />
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={markUnrecognized}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/[0.04] px-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                      >
                        <MarkUnrecognizedIcon className="h-4 w-4 shrink-0" />
                        Mark Unrecognized
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-white/[0.02] p-6 text-center">
                    <div className="text-sm font-medium text-foreground">
                      No more suggestions
                    </div>
                    <div className="max-w-xs text-xs text-muted-foreground">
                      Search the catalog manually or add this object as new equipment.
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={searchCatalog}
                        className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs text-foreground hover:bg-white/[0.04]"
                      >
                        <Search className="h-3.5 w-3.5" />
                        Search catalog manually
                      </button>
                      <button
                        type="button"
                        onClick={addAsNew}
                        className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs text-foreground hover:bg-white/[0.04]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add as new equipment
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Shortcut hint strip */}
            <div className="border-t border-border px-6 py-2 text-xs text-muted-foreground">
              <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px]">Enter</kbd> Confirm
              {" · "}
              <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px]">S</kbd> Skip
              {" · "}
              <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px]">←</kbd>{" "}
              <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px]">→</kbd> Navigate
            </div>
          </section>
        </div>
      ) : (
        <EmptyQueue onBack={() => navigate({ to: "/out-of-catalog" })} />
      )}

      <Toaster />
    </div>
  );
}

type BannerState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function BindBanner({
  banner,
  onDismiss,
  onSimulateError,
}: {
  banner: BannerState;
  onDismiss: () => void;
  onSimulateError: () => void;
}) {
  const isSuccess = banner.kind === "success";
  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-opacity ${
        isSuccess
          ? "border-brand/40 bg-brand/15 text-foreground"
          : "border-red-500/40 bg-red-500/15 text-foreground"
      }`}
    >
      {isSuccess ? (
        <Check size={16} style={{ color: "#3BB6E9" }} className="shrink-0" />
      ) : (
        <AlertCircle size={16} style={{ color: "#EF4444" }} className="shrink-0" />
      )}
      <span className="flex-1">{banner.message}</span>
      {isSuccess && (
        <button
          type="button"
          onClick={onSimulateError}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Simulate error
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  const empty = !value || value === "Invalid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
        empty
          ? "border-white/10 bg-white/[0.02] text-white/40"
          : "border-white/15 bg-white/[0.06] text-foreground"
      }`}
    >
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span>{value || "—"}</span>
    </span>
  );
}

function MatchScoreBadge({ score }: { score: number }) {
  // Desaturated, dark-mode friendly tones aligned with ConfidenceBadge.
  const tone =
    score >= 80
      ? { bg: "rgba(150,200,170,0.10)", fg: "#8FBFA3" }
      : score >= 50
      ? { bg: "rgba(220,190,140,0.10)", fg: "#C9B07A" }
      : { bg: "rgba(220,150,150,0.10)", fg: "#C98A8A" };
  return (
    <span
      className="ml-2 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
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
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-medium tabular-nums" style={{ color }}>
        {n}
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface p-8">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Session complete
        </div>
        <h1 className="mt-2 text-2xl font-medium text-foreground">
          You reviewed {total} pending {total === 1 ? "object" : "objects"}.
        </h1>

        <div className="mt-6 grid grid-cols-4 gap-3">
          {stat("Bound", counts.bound ?? 0, "#22C55E")}
          {stat("Added", counts.added ?? 0, "#3BB6E9")}
          {stat("Skipped", counts.skipped ?? 0, "rgba(255,255,255,0.8)")}
          {stat("Unrecognized", counts.unrecognized ?? 0, "#A878EC")}
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
