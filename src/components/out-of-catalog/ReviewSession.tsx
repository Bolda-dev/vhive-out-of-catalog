import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ListChecks,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crop,
  ExternalLink,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  SkipForward,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";



import { appToast } from "@/components/ui/app-toast";
import { mockOutOfCatalog } from "@/data/mockOutOfCatalog";
import { mockCatalog } from "@/data/mockCatalog";
import { Toaster } from "@/components/ui/sonner";
import { AddNewBindIcon, BindToExistingIcon, MarkUnrecognizedIcon } from "@/components/out-of-catalog/RowActions";
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
import { CreateEquipmentSheet } from "./CreateEquipmentSheet";

type Decision = "bound" | "skipped" | "unrecognized" | "added";
type ImgStatus = "pending" | "approved" | "rejected";
// key = `${rowId}|${captureId}` — approvals belong to the photo, not the suggestion
type ApprovalMap = Record<string, ImgStatus>;

const pending = mockOutOfCatalog.filter((r) => r.status === "Pending");

export function ReviewSession({ onExit }: { onExit: () => void }) {

  const [currentIndex, setCurrentIndex] = useState(0);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [dismissed, setDismissed] = useState<Record<string, Set<string>>>({});
  const [approvals, setApprovals] = useState<ApprovalMap>({});
  const [pendingBindId, setPendingBindId] = useState<string | null>(null);
  const [bindAnim, setBindAnim] = useState<{ label: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

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
      if (!current) return "pending";
      return approvals[`${current.id}|${capId}`] ?? "pending";
    },
    [approvals, current],
  );

  const allDecided = useMemo(() => {
    if (!current || captureCount === 0) return false;
    return captures.every((c) => statusFor(c.id) !== "pending");
  }, [captures, captureCount, current, statusFor]);

  const allApproved = useMemo(() => {
    if (!current || captureCount === 0) return false;
    return captures.every((c) => statusFor(c.id) === "approved");
  }, [captures, captureCount, current, statusFor]);

  const phase: "approving" | "reviewing" = allDecided ? "reviewing" : "approving";

  // Stagger the right-panel reveal: let the left side switch to grid first,
  // then fade the dim overlay out and bring the right panel to full opacity.
  const [revealRight, setRevealRight] = useState(false);
  useEffect(() => {
    if (phase !== "reviewing") {
      setRevealRight(false);
      return;
    }
    const t = window.setTimeout(() => setRevealRight(true), 420);
    return () => window.clearTimeout(t);
  }, [phase]);

  const setStatusFor = useCallback(
    (s: ImgStatus, capId: string) => {
      if (!current) return;
      const key = `${current.id}|${capId}`;
      setApprovals((prev) => ({ ...prev, [key]: s }));
    },
    [current],
  );

  const clearCaptureStatus = useCallback(
    (capId: string) => {
      if (!current) return;
      const key = `${current.id}|${capId}`;
      setApprovals((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      const idx = captures.findIndex((c) => c.id === capId);
      if (idx >= 0) setCaptureIndex(idx);
    },
    [captures, current],
  );

  const resetAllApprovals = useCallback(() => {
    if (!current) return;
    setApprovals((prev) => {
      const next = { ...prev };
      captures.forEach((c) => delete next[`${current.id}|${c.id}`]);
      return next;
    });
    setCaptureIndex(0);
  }, [captures, current]);

  const setStatus = useCallback(
    (s: ImgStatus) => {
      if (!current || !currentCapture) return;
      setStatusFor(s, currentCapture.id);
      // advance to next pending image if any
      const nextPendingIdx = (() => {
        for (let step = 1; step <= captureCount; step++) {
          const idx = (safeCaptureIdx + step) % captureCount;
          const cap = captures[idx];
          if (!cap) continue;
          const k = `${current.id}|${cap.id}`;
          const status = idx === safeCaptureIdx ? s : (approvals[k] ?? "pending");
          if (status === "pending") return idx;
        }
        return -1;
      })();
      if (nextPendingIdx >= 0) setCaptureIndex(nextPendingIdx);
    },
    [approvals, captureCount, captures, current, currentCapture, safeCaptureIdx, setStatusFor],
  );

  const goNext = useCallback(() => {
    setCaptureIndex(0);
    setSuggestionIndex(0);
    setCurrentIndex((i) => Math.min(i + 1, total));
  }, [total]);

  const confirmBind = useCallback(
    (overrideCatalogId?: string) => {
      if (!current) return;
      const item = overrideCatalogId
        ? mockCatalog.find((c) => c.id === overrideCatalogId)
        : selected?.item;
      if (!item) return;
      const label = `${item.manufacturer} ${item.model}`;
      playBindSound();
      setBindAnim({ label });
      window.setTimeout(() => {
        setDecisions((prev) => ({ ...prev, [current.id]: "bound" }));
        appToast({ variant: "success", title: "Bound to catalog item", description: label });
        setBindAnim(null);
        setSearchOpen(false);
        setSearchQuery("");
        goNext();
      }, 1100);
    },
    [current, selected, goNext],
  );

  const skipSession = useCallback(() => {
    onExit();
  }, [onExit]);


  const markUnrecognized = useCallback(() => {
    if (!current || phase !== "reviewing") return;
    setDecisions((prev) => ({ ...prev, [current.id]: "unrecognized" }));
    appToast({ title: "Marked as Unrecognized" });
    goNext();
  }, [current, goNext, phase]);

  const addAsNew = useCallback(() => {
    if (!current || phase !== "reviewing") return;
    setCreateOpen(true);
  }, [current, phase]);

  const submitNewEquipment = useCallback(() => {
    if (!current) return;
    setDecisions((prev) => ({ ...prev, [current.id]: "added" }));
    appToast({ variant: "success", title: "Added as new equipment" });
    setCreateOpen(false);
    goNext();
  }, [current, goNext]);

  const searchCatalog = useCallback(() => {
    if (phase !== "reviewing") return;
    setSearchOpen(true);
  }, [phase]);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

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
        (document.activeElement as HTMLElement | null)?.blur?.();
        if (phase === "reviewing") {
          if (selected) setPendingBindId(selected.item.id);
        } else {
          setStatus("approved");
        }
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.();
        if (phase === "approving") setStatus("rejected");
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
    captureCount,
    dismissSuggestion,
    done,
    markUnrecognized,
    phase,
    searchCatalog,
    selected,
    setStatus,
    skipSession,
    suggestionCount,
  ]);

  return (
    <div className="-mt-4 -mb-4 flex h-[calc(100vh-72px-76px)] flex-col bg-background text-foreground">
      {done ? (
        <SessionComplete
          decisions={decisions}
          total={total}
          onBack={onExit}
        />
      ) : current ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Exit session bar */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 pt-0 pb-1">
            <h1 className="text-base font-medium text-foreground">Review Session</h1>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-9 items-center overflow-hidden rounded-md border transition-[width,border-color,background-color,opacity] duration-300 ease-out ${
                  searchOpen ? "w-[320px] bg-background/40" : "w-[180px] bg-transparent hover:bg-white/[0.04]"
                } ${!searchOpen && phase !== "reviewing" ? "opacity-50" : "opacity-100"}`}
                style={{ borderColor: searchOpen ? "#3BB6E9" : "#E0E0E0" }}
              >
                {searchOpen ? (
                  <div className="flex h-full w-full items-center gap-2 px-3">
                    <Search className="h-4 w-4 shrink-0" style={{ color: "#3BB6E9" }} />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          closeSearch();
                        }
                      }}
                      placeholder="Type, manufacturer, model…"
                      className="h-full w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={closeSearch}
                      aria-label="Close search"
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex h-full w-full">
                          <button
                            type="button"
                            onClick={searchCatalog}
                            disabled={phase !== "reviewing"}
                            className="group flex h-full w-full items-center gap-2 px-3 text-sm font-normal transition-opacity hover:opacity-100 disabled:cursor-not-allowed"
                            style={{ color: "#E0E0E0" }}
                          >
                            <Search className="h-4 w-4" style={{ color: "#E0E0E0" }} />
                            Search from catalog
                          </button>
                        </span>
                      </TooltipTrigger>
                      {phase !== "reviewing" && (
                        <TooltipContent
                          side="bottom"
                          className="border border-border bg-[#1E1E1E] text-foreground"
                        >
                          Approve or reject every captured image first
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Secondary actions — left of CTA */}
              <button
                type="button"
                onClick={markUnrecognized}
                className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-normal transition-colors hover:bg-white/[0.04]"
                style={{ borderColor: "#E0E0E0", color: "#E0E0E0" }}
                title="Mark as unrecognized (U)"
              >
                <MarkUnrecognizedIcon className="h-4 w-4" />
                Unrecognize
              </button>
              <button
                type="button"
                onClick={skipSession}
                className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-normal transition-colors hover:bg-white/[0.04]"
                style={{ borderColor: "#E0E0E0", color: "#E0E0E0" }}
                title="Skip session (S)"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </button>

              {/* Bind split-button (CTA) */}
              <div className="inline-flex h-9 items-stretch">
                <button
                  type="button"
                  onClick={() => selected && setPendingBindId(selected.item.id)}
                  disabled={!selected || phase !== "reviewing"}
                  className="inline-flex items-center gap-2 rounded-l-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "#3BB6E9", color: "#0b1418" }}
                  title={
                    phase !== "reviewing"
                      ? "Approve or reject every captured image first"
                      : selected
                      ? "Bind to suggestion (Enter)"
                      : "No suggestion selected"
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M11.1818 0C8.16121 0 5.59353 1.97466 4.70067 4.70067C1.97466 5.59353 0 8.16121 0 11.1818C0 14.9414 3.05863 18 6.81817 18C9.83879 18 12.4065 16.0253 13.2993 13.2993C16.0253 12.4065 18 9.83879 18 6.81817C18 3.05863 14.9414 0 11.1818 0ZM6.81817 16.3637C3.96091 16.3637 1.63635 14.0391 1.63635 11.1818C1.63635 9.21076 2.74264 7.49341 4.36679 6.61757C4.36489 6.68422 4.36363 6.75109 4.36363 6.81817C4.36363 10.5777 7.42226 13.6363 11.1818 13.6363C11.2489 13.6363 11.3157 13.6351 11.3824 13.6332C10.5066 15.2574 8.78924 16.3637 6.81817 16.3637ZM13.6332 11.3824C13.6351 11.3158 13.6364 11.2489 13.6364 11.1818C13.6364 7.42229 10.5777 4.36366 6.8182 4.36366C6.75112 4.36366 6.68426 4.36493 6.6176 4.36683C7.49345 2.74268 9.2108 1.63638 11.1819 1.63638C14.0391 1.63638 16.3637 3.96095 16.3637 6.8182C16.3637 8.78924 15.2574 10.5066 13.6332 11.3824Z" fill="currentColor" />
                  </svg>
                  Bind to suggestion
                </button>
                <div className="w-px bg-black/20" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={phase !== "reviewing"}
                      className="inline-flex items-center justify-center rounded-r-md px-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ background: "#3BB6E9", color: "#0b1418" }}
                      title={phase !== "reviewing" ? "Approve or reject every captured image first" : "More bind options"}
                      aria-label="More bind options"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-auto min-w-[240px]">
                    <DropdownMenuItem
                      onClick={addAsNew}
                      disabled={phase !== "reviewing"}
                      className="whitespace-nowrap"
                      title={phase !== "reviewing" ? "Approve or reject every captured image first" : undefined}
                    >
                      <AddNewBindIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="flex-1 whitespace-nowrap">New equipment</span>
                      <span className="ml-3 text-xs text-muted-foreground whitespace-nowrap">Ctrl+Enter</span>
                    </DropdownMenuItem>

                  </DropdownMenuContent>
                </DropdownMenu>
              </div>



              <span className="mx-1 h-6 w-px bg-white/10" />
              <button
                type="button"
                onClick={onExit}
                className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-normal transition-colors hover:bg-white/[0.04]"
                style={{ borderColor: "#E0E0E0", color: "#E0E0E0" }}
                title="Exit session"
              >
                <X className="h-4 w-4" style={{ color: "#E0E0E0" }} />
                Exit session
              </button>
            </div>
          </div>






          {/* Compare images + vertical suggestion rail */}
          <section
            className="grid min-h-0 flex-1 gap-3 px-6 pt-1 pb-0"
            style={{
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            }}
          >
            {/* Left card: captured image + captured images rail */}
            <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
              <CaptureImagePanel
                src={currentCapture?.imageUrl}
                status={currentCapture ? statusFor(currentCapture.id) : "pending"}
                type={current.aiType}
                manufacturer={current.aiManufacturer}
                model={current.aiModel}
                capturedAt={currentCapture?.capturedAt}
                account={current.account}
                rack={currentCapture?.location}
                onApprove={() => setStatus("approved")}
                onReject={() => setStatus("rejected")}
                canAct={!!currentCapture}
                captureKey={currentCapture?.id ?? ""}
                gridMode={phase === "reviewing"}
                captures={captures}
                statusFor={statusFor}
                onCaptureSetStatus={setStatusFor}
                onCaptureClearStatus={clearCaptureStatus}
                onResetAllApprovals={resetAllApprovals}
              />

              {/* Captured images rail — only during approving phase */}
              {phase === "approving" && (
                <div className="flex h-[196px] shrink-0 flex-col">
                  <div className="flex h-8 shrink-0 items-center px-3">
                    <span className="text-xs text-muted-foreground">Captured images</span>
                  </div>
                  <ThumbRail itemWidth={236} className="flex-1" activeIndex={safeCaptureIdx}>
                    {captures.map((cap, i) => {
                      const status = statusFor(cap.id);
                      const active = i === safeCaptureIdx;
                      const borderColor = active
                        ? "#3BB6E9"
                        : status === "approved"
                        ? "#8FD3A8"
                        : status === "rejected"
                        ? "#d97a72"
                        : "transparent";
                      return (
                        <button
                          key={cap.id}
                          type="button"
                          onClick={() => setCaptureIndex(i)}
                          className="group relative h-full w-[220px] shrink-0 overflow-hidden rounded-lg border-2 transition hover:opacity-100"
                          style={{ borderColor, opacity: active ? 1 : 0.92 }}
                        >
                          <img src={cap.imageUrl} alt="" className="h-full w-full object-cover" />
                          <StatusToggle
                            status={status}
                            onSet={(s) => setStatusFor(s, cap.id)}
                            onClear={() => clearCaptureStatus(cap.id)}
                          />

                        </button>
                      );
                    })}
                  </ThumbRail>
                </div>
              )}
            </div>


            {/* Combined Catalog reference + AI suggestions card (stacked) */}
            <div className="relative flex min-h-0 flex-col">
              <div
                className={`flex min-h-0 flex-1 flex-col transition-opacity duration-500 ease-out ${
                  revealRight ? "opacity-100" : "pointer-events-none opacity-30"
                }`}
              >
            {searchOpen ? (
              <div key="search" className="flex h-full min-h-0 flex-col animate-fade-in">
                <CatalogSearchPanel
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  onClose={closeSearch}
                  onBind={(id) => setPendingBindId(id)}
                />
              </div>
            ) : (
            <div key="reference" className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface animate-fade-in">{/* legacy card */}
              {/* Top: catalog reference — hidden when no suggestions so empty state can fill */}
              {suggestionCount > 0 && (
                <>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex h-8 shrink-0 items-center border-b border-border/60 px-3">
                      <span className="text-xs text-muted-foreground">Catalog reference</span>
                    </div>
                    <div className="relative flex min-h-0 flex-1 items-center justify-center bg-background">
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

                  {/* Horizontal divider */}
                  <div className="h-px shrink-0 bg-border/60" />
                </>
              )}

              {/* Bottom: suggestions / empty state */}
              {suggestionCount === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <NoSuggestionsEmpty
                    onAddAsNew={addAsNew}
                    onUnrecognize={markUnrecognized}
                    onSearch={searchCatalog}
                    onRecreate={recreateSuggestions}
                    canRecreate={(dismissed[current.id]?.size ?? 0) > 0}
                  />
                </div>
              ) : (
                <div className="flex h-[196px] shrink-0 flex-col">
                  <div className="flex h-8 shrink-0 items-center justify-between px-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: "#3BB6E9" }} />
                      AI suggested matches
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {`${safeSuggestionIdx + 1} / ${suggestionCount}`}
                    </span>
                  </div>
                  <ThumbRail itemWidth={196} className="flex-1">
                    {suggestions.map((s, i) => {
                      const active = i === safeSuggestionIdx;
                      const label = `${s.item.manufacturer} ${s.item.model}`;
                      return (
                        <div
                          key={s.item.id}
                          className="relative h-full w-[180px] shrink-0 overflow-hidden rounded-lg border-2 bg-background/40 transition"
                          style={{
                            borderColor: active ? "#3BB6E9" : "transparent",
                            opacity: active ? 1 : 0.85,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setSuggestionIndex(i)}
                            className="flex h-full w-full flex-col text-left"
                          >
                            <div className="h-[88px] w-full shrink-0 overflow-hidden bg-background">
                              <img
                                src={s.item.referenceImageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="flex flex-1 flex-col gap-1 px-2.5 py-2">
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
                        </div>
                      );
                    })}
                  </ThumbRail>
                </div>
              )}
            </div>
            )}
              </div>
              <div
                className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
                  revealRight ? "opacity-0" : "opacity-100"
                }`}
                aria-hidden={revealRight}
              >
                <div className="flex flex-col items-center gap-3 text-center text-sm text-foreground">
                  <ListChecks
                    className="h-8 w-8 animate-pulse"
                    style={{ color: "#3BB6E9" }}
                    strokeWidth={1.75}
                  />
                  <span>Approve or reject every captured image first</span>
                </div>
              </div>
            </div>
          </section>





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
        <EmptyQueue onBack={onExit} />
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
                const id = pendingBindId;
                setPendingBindId(null);
                confirmBind(id ?? undefined);
              }}
              className="bg-brand text-background hover:bg-brand/90"
            >
              Confirm &amp; Bind
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateEquipmentSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        approvedCount={captures.filter((c) => statusFor(c.id) === "approved").length}
        hasRejected={captures.some((c) => statusFor(c.id) === "rejected")}
        defaultImage={
          captures.find((c) => statusFor(c.id) === "approved")?.imageUrl ??
          currentCapture?.imageUrl ??
          null
        }
        onSubmit={submitNewEquipment}
      />

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
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-background">
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
              title="Not part of the group (Backspace)"
            >
              <X className="h-3.5 w-3.5" /> Not part of the group

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
    <div className="fixed bottom-0 left-0 right-0 z-40 flex shrink-0 flex-col gap-2 bg-surface px-6 py-2.5">

      <ShortcutsScroller>
        <ShortcutGroup
          label="Image"
          items={[
            { keys: <Kbd>Enter</Kbd>, action: allApproved ? "Bind" : "Approve" },
            { keys: <Kbd>⌫</Kbd>, action: "Not part of the group" },
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


type Rect = { x: number; y: number; w: number; h: number };
const DEFAULT_RECT: Rect = { x: 26, y: 34, w: 48, h: 34 };
const MIN_SIZE = 8;

function StatusToggle({
  status,
  onSet,
  onClear,
  size = "sm",
}: {
  status: ImgStatus;
  onSet: (s: "approved" | "rejected") => void;
  onClear: () => void;
  size?: "sm" | "md";
}) {
  const dims = size === "md" ? "h-6 w-6" : "h-5 w-5";
  const icon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const cycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === "pending") onSet("approved");
    else if (status === "approved") onSet("rejected");
    else onClear();
  };
  const approved = status === "approved";
  const rejected = status === "rejected";
  const title = approved
    ? "Approved — click for Not part of the group"
    : rejected
      ? "Not part of the group — click to clear"
      : "Click to approve";
  const style: React.CSSProperties = approved
    ? { background: "#8FD3A8", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }
    : rejected
      ? { background: "#d97a72", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }
      : { background: "rgba(0,0,0,0.45)", border: "1px dashed rgba(255,255,255,0.4)" };
  return (
    <div className="absolute left-1.5 top-1.5 z-10">
      <button
        type="button"
        onClick={cycle}
        title={title}
        aria-label={title}
        className={`inline-flex ${dims} items-center justify-center rounded-full transition hover:scale-110`}
        style={style}
      >
        {approved && <Check className={icon} strokeWidth={3.5} style={{ color: "#ffffff" }} />}
        {rejected && <X className={icon} strokeWidth={3.5} style={{ color: "#ffffff" }} />}
      </button>
    </div>
  );
}





function CaptureImagePanel({
  src,
  status,
  type,
  manufacturer,
  model,
  capturedAt,
  account,
  rack,
  onApprove,
  onReject,
  canAct,
  captureKey,
  gridMode,
  captures,
  statusFor,
  onCaptureSetStatus,
  onCaptureClearStatus,
  onResetAllApprovals,
}: {
  src?: string;
  status?: ImgStatus;
  type?: string;
  manufacturer?: string;
  model?: string;
  capturedAt?: string;
  account?: string;
  rack?: string;
  onApprove?: () => void;
  onReject?: () => void;
  canAct?: boolean;
  captureKey: string;
  gridMode?: boolean;
  captures?: import("@/data/outOfCatalogTypes").OocCapture[];
  statusFor?: (capId: string) => ImgStatus;
  onCaptureSetStatus?: (s: ImgStatus, capId: string) => void;
  onCaptureClearStatus?: (capId: string) => void;
  onResetAllApprovals?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rect, setRect] = useState<Rect>(DEFAULT_RECT);
  const [dragCorner, setDragCorner] = useState<0 | 1 | 2 | 3 | null>(null);

  // Reset rectangle when capture changes
  useEffect(() => {
    setRect(DEFAULT_RECT);
    setEditing(false);
  }, [captureKey]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragCorner === null) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const px = Math.max(2, Math.min(98, ((e.clientX - bounds.left) / bounds.width) * 100));
    const py = Math.max(2, Math.min(98, ((e.clientY - bounds.top) / bounds.height) * 100));
    setRect((prev) => {
      // Opposite corner stays fixed. Corners: 0=TL, 1=TR, 2=BR, 3=BL
      const left = prev.x;
      const right = prev.x + prev.w;
      const top = prev.y;
      const bottom = prev.y + prev.h;
      let nL = left, nR = right, nT = top, nB = bottom;
      if (dragCorner === 0) { nL = Math.min(px, right - MIN_SIZE); nT = Math.min(py, bottom - MIN_SIZE); }
      if (dragCorner === 1) { nR = Math.max(px, left + MIN_SIZE); nT = Math.min(py, bottom - MIN_SIZE); }
      if (dragCorner === 2) { nR = Math.max(px, left + MIN_SIZE); nB = Math.max(py, top + MIN_SIZE); }
      if (dragCorner === 3) { nL = Math.min(px, right - MIN_SIZE); nB = Math.max(py, top + MIN_SIZE); }
      return { x: nL, y: nT, w: nR - nL, h: nB - nT };
    });
  };

  const confirmCrop = () => {
    setEditing(false);
    appToast({ title: "Re-running AI search with new crop" });
  };

  const corners: Array<{ id: 0 | 1 | 2 | 3; x: number; y: number }> = [
    { id: 0, x: rect.x, y: rect.y },
    { id: 1, x: rect.x + rect.w, y: rect.y },
    { id: 2, x: rect.x + rect.w, y: rect.y + rect.h },
    { id: 3, x: rect.x, y: rect.y + rect.h },
  ];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">

      <div className="flex items-stretch gap-3 border-b border-border/60 px-3 py-2">
        {/* Title block — spans both rows */}
        <div className="flex shrink-0 items-center gap-2 border-r border-white/10 pr-3">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#3BB6E9]/12 text-[#3BB6E9]">
            <svg width="18" height="18" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M5.79858 1.5V2.78655V6.6462V15.7807V19.6404V23.5H8.47752L10.0303 20.9269H14.0894L15.6421 23.5H18.321V1.5H5.79858ZM7.08513 2.78655H17.0345V19.6404H7.08513V2.78655ZM7.75122 22.2134H7.08513V20.9269H8.52761L7.75122 22.2134ZM17.0345 22.2134H16.3684L15.592 20.9269H17.0345V22.2134Z" fill="currentColor"/>
              <path d="M9.24048 4.37341H15.759V5.65996H9.24048V4.37341Z" fill="currentColor"/>
              <path d="M9.24048 6.94641H15.759V8.23296H9.24048V6.94641Z" fill="currentColor"/>
              <path d="M14.4722 10.4633H15.7587V13.8512H14.4722V10.4633Z" fill="currentColor"/>
            </svg>
            <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-[#3BB6E9]" strokeWidth={2.5} />
          </span>
          {(() => {
            // Deterministic 80–95% score per capture
            let h = 0;
            for (let i = 0; i < captureKey.length; i++) h = (h * 31 + captureKey.charCodeAt(i)) | 0;
            const score = 80 + (Math.abs(h) % 16);
            return (
              <div className="flex flex-col items-start gap-1 leading-tight">
                <span className="text-sm font-medium text-foreground">Rack Suggestion</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] tabular-nums"
                  style={{ backgroundColor: "rgba(150,200,170,0.10)", color: "#8FBFA3" }}
                  title="AI match confidence"
                >
                  Confidence <span className="text-xs font-semibold">{score}%</span>
                </span>
              </div>
            );
          })()}


        </div>

        {/* Right side — two rows */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          {/* Row 1 — identity */}
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
              <MetaField label="Type" value={type || "—"} />
              <span className="h-3 w-px shrink-0 bg-white/10" />
              <MetaField label="Manufacturer" value={manufacturer || "—"} />
              <span className="h-3 w-px shrink-0 bg-white/10" />
              <MetaField label="Model" value={model || "—"} truncate />
            </div>
          </div>
          {/* Row 2 — capture context */}
          {(capturedAt || account || rack) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
              {capturedAt && <span className="shrink-0">{capturedAt}</span>}
              {account && (
                <>
                  <span className="h-3 w-px shrink-0 bg-white/10" />
                  <span className="inline-flex h-6 shrink-0 items-center rounded-md border border-border bg-background px-2 text-[13px] text-foreground">
                    {account}
                  </span>
                </>
              )}

              {rack && (
                <>
                  <span className="h-3 w-px shrink-0 bg-white/10" />
                  <button
                    type="button"
                    onClick={() => appToast({ title: `Opening ${rack}` })}
                    className="inline-flex shrink-0 items-center gap-1 text-[13px] text-[#3BB6E9] hover:underline"
                    title="Open rack"
                  >
                    <span className="max-w-[280px] truncate">{rack}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>


                </>
              )}
            </div>
          )}
        </div>
      </div>

      {gridMode && captures && statusFor ? (
        <div className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="ooc-thumb-scroll min-h-0 flex-1 overflow-y-auto bg-background p-3">
            <div className="grid grid-cols-2 gap-3">
              {captures.map((cap) => {
                const s = statusFor(cap.id);
                const borderColor =
                  s === "approved" ? "#8FD3A8" : s === "rejected" ? "#d97a72" : "transparent";
                return (
                  <div
                    key={cap.id}
                    className="relative overflow-hidden rounded-lg border-2"
                    style={{ borderColor }}
                  >
                    <img
                      src={cap.imageUrl}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <StatusToggle
                      status={s}
                      size="md"
                      onSet={(ns) => onCaptureSetStatus?.(ns, cap.id)}
                      onClear={() => onCaptureClearStatus?.(cap.id)}
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                          title="More actions"
                          aria-label="More actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[180px]">
                        <DropdownMenuItem onClick={() => onCaptureClearStatus?.(cap.id)}>
                          Re-review this image
                        </DropdownMenuItem>
                        {onResetAllApprovals && (
                          <DropdownMenuItem onClick={() => onResetAllApprovals()}>
                            Re-review all images
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-background"
            onPointerMove={onPointerMove}
            onPointerUp={() => setDragCorner(null)}
            onPointerLeave={() => setDragCorner(null)}
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

            {/* Rectangle overlay */}
            {src && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <rect
                  x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                  fill="none"
                  stroke="rgba(0,0,0,0.85)"
                  vectorEffect="non-scaling-stroke"
                  style={{ strokeWidth: 4 } as React.CSSProperties}
                />
                <rect
                  x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                  fill="rgba(59,182,233,0.08)"
                  stroke="#3BB6E9"
                  vectorEffect="non-scaling-stroke"
                  style={{ strokeWidth: 2 } as React.CSSProperties}
                />
              </svg>
            )}

            {/* Corner handles (editable) */}
            {src && editing && (
              <div className="absolute inset-0">
                {corners.map((c) => (
                  <div
                    key={c.id}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      setDragCorner(c.id);
                    }}
                    className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-white shadow active:cursor-grabbing"
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  />
                ))}
              </div>
            )}


            {/* Crop button — overlay above metadata */}
            {src && (
              <button
                type="button"
                onClick={() => (editing ? confirmCrop() : setEditing(true))}
                className={
                  editing
                    ? "absolute bottom-2 left-2 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium shadow-[0_0_0_2px_rgba(143,211,168,0.5)] transition hover:brightness-110"
                    : "absolute bottom-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/70"
                }
                style={
                  editing
                    ? { background: "#8FD3A8", color: "#1A1A1A" }
                    : undefined
                }
                title={editing ? "Confirm crop (re-run AI)" : "Edit crop"}
              >
                {editing ? (
                  <>
                    <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: "#1A1A1A" }} />
                    <span>Confirm crop</span>
                  </>
                ) : (
                  <Crop className="h-3.5 w-3.5" />
                )}

              </button>
            )}

          </div>

          {/* Bottom black strip: reject/approve */}
          {src && onApprove && onReject && (
            <div className="flex items-center justify-end gap-1.5 border-t border-border/60 bg-black px-2 py-1.5">
              <button
                type="button"
                onClick={onReject}
                disabled={!canAct || editing}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: "#d97a72", border: "1px solid #d97a72" }}
                title={editing ? "Finish crop first" : "Not part of the group (Backspace)"}
              >
                <X className="h-3.5 w-3.5" /> Not part of the group

              </button>

              <button
                type="button"
                onClick={onApprove}
                disabled={!canAct || editing}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: "#8FD3A8",
                  color: "#0F2A1C",
                }}
                title={editing ? "Finish crop first" : "Approve (Enter)"}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Approve
              </button>
            </div>
          )}

        </>
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center overflow-y-auto p-4">
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

      <div className="mt-4 grid grid-cols-2 gap-2 mx-auto w-full max-w-[360px]">
        <EmptyAction
          onClick={onAddAsNew}
          icon={<AddNewBindIcon className="h-6 w-6" />}
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
          icon={<Search className="h-6 w-6" style={{ color: "#3BB6E9" }} />}
          title="Search the catalog"
          subtitle="Find a match manually"
          shortcut={<Kbd>F</Kbd>}
        />
        <EmptyAction
          onClick={onUnrecognize}
          icon={<MarkUnrecognizedIcon className="h-6 w-6" />}
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
      className="group relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border bg-background/40 p-3 text-center transition hover:bg-background/70"
      style={{
        borderColor: primary ? "#3BB6E9" : "rgba(255,255,255,0.12)",
        boxShadow: primary ? "0 0 0 1px rgba(59,182,233,0.25)" : undefined,
      }}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1">{shortcut}</div>
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/[0.04]">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col items-center">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  );
}


// ---------- Catalog Search Panel ----------
function CatalogSearchPanel({
  query,
  onQueryChange,
  onClose,
  onBind,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onClose: () => void;
  onBind: (catalogId: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setPreview(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [preview]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockCatalog;
    return mockCatalog.filter((c) =>
      [c.type, c.manufacturer, c.model, c.category, c.classification]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  return (
    <div className="custom-scrollbar relative flex h-full min-h-0 flex-1 flex-col overflow-auto rounded-lg border border-border bg-background">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-20 bg-[#121212]">
          <tr>
            <th
              colSpan={5}
              className="border-b border-border px-3 py-3 text-left text-sm font-semibold text-white"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Search className="h-4 w-4" style={{ color: "#3BB6E9" }} />
                  Catalog search
                </span>
                <span className="text-xs font-normal text-white/60 tabular-nums">
                  {results.length} result{results.length === 1 ? "" : "s"}
                </span>
              </div>
            </th>
          </tr>
          <tr>
            <th
              style={{ width: 72, minWidth: 72 }}
              className="border-b border-border bg-[#121212] px-2 py-3 text-left text-sm font-semibold text-white"
            >
              Image
            </th>
            <th
              style={{ width: 96, minWidth: 96 }}
              className="border-b border-border bg-[#121212] px-2 py-3 text-left text-sm font-semibold text-white"
            >
              Type
            </th>
            <th
              style={{ width: 110, minWidth: 110 }}
              className="border-b border-border bg-[#121212] px-2 py-3 text-left text-sm font-semibold text-white"
            >
              Manufacturer
            </th>
            <th
              className="border-b border-border bg-[#121212] px-2 py-3 text-left text-sm font-semibold text-white"
            >
              Model
            </th>
            <th
              style={{ width: 88, minWidth: 88 }}
              className="border-b border-border bg-[#121212] px-2 py-3 text-right text-sm font-semibold text-white"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {results.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                No catalog items match "{query}"
              </td>
            </tr>
          ) : (
            results.map((item) => (
              <tr
                key={item.id}
                className="transition-colors animate-fade-in hover:bg-row-hover"
                style={{
                  color: "rgba(255, 255, 255, 0.87)",
                  fontFamily: "Roboto, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "21px",
                }}
              >
                <td className="border-b border-border/60 px-2 py-2 align-middle">
                  <button
                    type="button"
                    onClick={() => setPreview(item.referenceImageUrl)}
                    className="group relative h-14 w-14 overflow-hidden rounded-md border border-border bg-background transition hover:border-[#3BB6E9]"
                    title="Click to enlarge"
                  >
                    <img
                      src={item.referenceImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <ZoomIn className="h-5 w-5" style={{ color: "#ffffff" }} />
                    </span>
                  </button>
                </td>
                <td className="truncate border-b border-border/60 px-2 py-3 align-middle text-[13px]">
                  {item.type}
                </td>
                <td className="truncate border-b border-border/60 px-2 py-3 align-middle">
                  {item.manufacturer}
                </td>
                <td className="border-b border-border/60 px-2 py-3 align-middle">
                  <div className="min-w-0">
                    <div className="truncate">{item.model}</div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {item.classification}
                    </div>
                  </div>
                </td>
                <td className="border-b border-border/60 px-2 py-2 text-right align-middle">
                  <button
                    type="button"
                    onClick={() => onBind(item.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition hover:opacity-90"
                    style={{ background: "#3BB6E9", color: "#0b1418" }}
                    title="Bind to this catalog item"
                  >
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M11.1818 0C8.16121 0 5.59353 1.97466 4.70067 4.70067C1.97466 5.59353 0 8.16121 0 11.1818C0 14.9414 3.05863 18 6.81817 18C9.83879 18 12.4065 16.0253 13.2993 13.2993C16.0253 12.4065 18 9.83879 18 6.81817C18 3.05863 14.9414 0 11.1818 0ZM6.81817 16.3637C3.96091 16.3637 1.63635 14.0391 1.63635 11.1818C1.63635 9.21076 2.74264 7.49341 4.36679 6.61757C4.36489 6.68422 4.36363 6.75109 4.36363 6.81817C4.36363 10.5777 7.42226 13.6363 11.1818 13.6363C11.2489 13.6363 11.3157 13.6351 11.3824 13.6332C10.5066 15.2574 8.78924 16.3637 6.81817 16.3637ZM13.6332 11.3824C13.6351 11.3158 13.6364 11.2489 13.6364 11.1818C13.6364 7.42229 10.5777 4.36366 6.8182 4.36366C6.75112 4.36366 6.68426 4.36493 6.6176 4.36683C7.49345 2.74268 9.2108 1.63638 11.1819 1.63638C14.0391 1.63638 16.3637 3.96095 16.3637 6.8182C16.3637 8.78924 15.2574 10.5066 13.6332 11.3824Z" fill="currentColor" />
                    </svg>
                    Bind
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {preview && (
        <button
          type="button"
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-8 animate-fade-in"
          aria-label="Close preview"
        >
          <img
            src={preview}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
          <span className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white">
            <X className="h-4 w-4" />
          </span>
        </button>
      )}
    </div>


  );
}

// ---------- Shared horizontal rail with edge chevrons ----------
function ThumbRail({
  children,
  itemWidth = 200,
  className = "",
  activeIndex,
}: {
  children: React.ReactNode;
  itemWidth?: number;
  className?: string;
  activeIndex?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [updateEdges, children]);

  // Keep the active thumbnail visible: if it falls off either edge, scroll it
  // back into view aligned to the left (so the current is always seen).
  useEffect(() => {
    if (activeIndex == null) return;
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[activeIndex] as HTMLElement | undefined;
    if (!child) return;
    const childLeft = child.offsetLeft;
    const childRight = childLeft + child.offsetWidth;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth;
    if (childLeft < viewLeft || childRight > viewRight) {
      el.scrollTo({ left: Math.max(0, childLeft - 8), behavior: "smooth" });
    }
  }, [activeIndex, children]);

  const scrollBy = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * itemWidth, behavior: "smooth" });
  };

  return (
    <div className={`flex min-h-0 items-center ${className}`}>
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canLeft}
        aria-label="Scroll left"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-[#E0E0E0] transition hover:bg-white/[0.06] disabled:opacity-25"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        ref={scrollerRef}
        className="custom-scrollbar flex h-full min-w-0 flex-1 items-stretch gap-4 overflow-x-auto px-1 py-2 scroll-smooth"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canRight}
        aria-label="Scroll right"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-[#E0E0E0] transition hover:bg-white/[0.06] disabled:opacity-25"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
