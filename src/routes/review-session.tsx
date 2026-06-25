import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  
  Calendar,
  Check,
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
    return current.aiSuggestions
      .map((s) => {
        const item = mockCatalog.find((c) => c.id === s.catalogId);
        return item ? { item, score: s.matchScore } : null;
      })
      .filter((x): x is { item: typeof mockCatalog[number]; score: number } => !!x);
  }, [current]);
  const suggestionCount = suggestions.length;
  const pastEnd = suggestionIndex >= suggestionCount;
  const selected = !pastEnd ? suggestions[suggestionIndex] : null;
  const suggestion = selected?.item ?? null;

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
            {/* Header: hierarchical info + confidence */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col leading-tight">
                <span
                  className="text-lg font-medium"
                  style={{ color: "rgba(255,255,255,0.87)" }}
                >
                  {current.aiType}
                </span>
                <span className="text-sm flex items-center flex-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {current.aiType}
                  <span className="mx-1.5 text-white/30">›</span>
                  {current.aiManufacturer}
                  <span className="mx-1.5 text-white/30">›</span>
                  {current.aiModel}
                  <span className="mx-1.5 text-white/30">›</span>
                  <span className="mr-2">Confidence</span>
                  <ConfidenceBadge value={current.confidence} size="sm" />
                </span>
              </div>
            </div>


            {/* Rail (left) + Hero */}
            <div className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)] gap-3">
              <div className="custom-scrollbar flex w-[112px] flex-col gap-2 overflow-y-auto pr-1.5">
                {current.captures.map((cap, i) => (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => setCaptureIndex(i)}
                    className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-md border transition ${
                      i === captureIndex
                        ? "border-brand ring-2 ring-brand"
                        : "border-border hover:border-white/40"
                    }`}
                  >
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
                  </button>
                ))}
              </div>
              <div className="flex min-h-0 items-center justify-center rounded-lg border border-border bg-surface">
                <img
                  key={current.captures[captureIndex]?.id}
                  src={current.captures[captureIndex]?.imageUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain p-2"
                />
              </div>
            </div>



            {/* Caption */}
            {current.captures[captureIndex] && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
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
                <span className="text-white/30">—</span>
                <span className="italic">{current.captures[captureIndex].aiDescription}</span>
              </div>
            )}
          </section>

          {/* ===== BOTTOM (decision) ===== */}
          <section className="flex flex-[2] min-h-0 flex-col">
            <div className="grid flex-1 grid-cols-[1.4fr_1fr] divide-x divide-border">
              {/* LEFT: AI Suggested Matches */}
              <div className="flex min-h-0 flex-col overflow-hidden p-5">
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
                    {suggestionCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSuggestionIndex((i) => Math.max(0, i - 1))}
                          disabled={suggestionIndex === 0}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Previous suggestion"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[56px] text-center text-xs tabular-nums text-muted-foreground">
                          <span className="text-foreground">
                            {Math.min(suggestionIndex + 1, suggestionCount)}
                          </span>{" "}
                          of {suggestionCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSuggestionIndex((i) => Math.min(suggestionCount, i + 1))}
                          disabled={pastEnd}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Next suggestion"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>


                {suggestion && selected ? (
                  <div className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)] gap-4">
                    {/* Large reference image of selected suggestion */}
                    <div className="flex min-h-0 flex-col gap-2">
                      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-brand/60 bg-surface ring-1 ring-brand/30">
                        <img
                          key={suggestion.id}
                          src={suggestion.referenceImageUrl}
                          alt=""
                          className="max-h-full max-w-full object-contain p-2"
                        />
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-background">
                          {selected.score}% match
                        </span>
                      </div>
                      <div className="text-sm font-medium text-foreground">
                        {suggestion.manufacturer} · {suggestion.model}
                      </div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {suggestion.category} / {suggestion.classification} · {suggestion.heightU}U
                      </div>
                      <div className="inline-flex w-fit items-center gap-2 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        {stableBoundCount(suggestion.id)} bound
                      </div>
                    </div>

                    {/* Candidate cards */}
                    <div className="custom-scrollbar flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
                      {suggestions.map((s, i) => {
                        const active = i === suggestionIndex;
                        return (
                          <button
                            key={s.item.id}
                            type="button"
                            onClick={() => setSuggestionIndex(i)}
                            className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition ${
                              active
                                ? "border-brand bg-brand/10"
                                : "border-border bg-white/[0.02] hover:bg-white/[0.05]"
                            }`}
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
                        );
                      })}
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

              {/* RIGHT: Actions */}
              <div className="flex min-h-0 flex-col gap-2 overflow-auto p-5">
                <button
                  type="button"
                  onClick={confirmBind}
                  disabled={!selected}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white/[0.04] text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <BindToExistingIcon className="h-4 w-4 shrink-0" />
                  Confirm &amp; Bind ({current.instances})
                </button>
                <button
                  type="button"
                  onClick={addAsNew}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white/[0.04] text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                >
                  <AddNewBindIcon className="h-4 w-4 shrink-0" />
                  Add as new equipment
                </button>

                <div className="my-1 h-px bg-border" />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={skip}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/[0.04] text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={markUnrecognized}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/[0.04] text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                  >
                    <MarkUnrecognizedIcon className="h-4 w-4 shrink-0" />
                    Mark Unrecognized
                  </button>
                </div>
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
