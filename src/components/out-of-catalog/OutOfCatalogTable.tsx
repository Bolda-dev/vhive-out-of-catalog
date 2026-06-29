import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, FileSearch, ExternalLink, GripVertical } from "lucide-react";
import { useState } from "react";
import type { OocRow, OocStatus } from "@/data/outOfCatalogTypes";
import { cn } from "@/lib/utils";


export type SortDir = "asc" | "desc";
export type SortState = { colId: string; dir: SortDir } | null;

export interface ColumnMeta {
  id: keyof OocRow | "actions" | "link";
  label: string;
  sortable?: boolean;
  minWidth?: number;
  align?: "left" | "right";
}

export const ALL_OOC_COLUMNS: ColumnMeta[] = [
  { id: "detectedOn", label: "Detected on", sortable: true, minWidth: 180 },
  { id: "status", label: "Status", sortable: true, minWidth: 120 },
  { id: "equipmentType", label: "Equipment Type", sortable: true, minWidth: 220 },
  
  { id: "manufacturer", label: "Manufacturer", sortable: true, minWidth: 150 },
  { id: "model", label: "Model", sortable: true, minWidth: 140 },
  { id: "instances", label: "Instances", sortable: true, minWidth: 110 },
  { id: "rackUnits", label: "Rack Units", sortable: false, minWidth: 110 },
  { id: "account", label: "Account", sortable: false, minWidth: 130 },
  { id: "link", label: "Link", sortable: false, minWidth: 70 },
];

export const DEFAULT_VISIBLE_COLUMN_IDS = ALL_OOC_COLUMNS.map((c) => c.id);

export function getRowSortValue(row: OocRow, colId: string): string | number {
  switch (colId) {
    case "detectedOn":
      // "DD-MM-YYYY HH:mm:ss" → reformat to sortable
      return row.detectedOn.replace(
        /(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/,
        "$3$2$1$4$5$6",
      );
    case "status":
      return row.status;
    case "equipmentType":
      return row.equipmentType;
    case "manufacturer":
      return row.manufacturer;
    case "model":
      return row.model;
    case "instances":
      return row.instances;
    case "confidence":
      return row.confidence;
    case "rackUnits":
      return row.rackUnits ?? "";
    case "account":
      return row.account;
    default:
      return "";
  }
}

interface Filters {
  status: OocStatus | "";
  equipmentType: string;
  manufacturer: string;
  model: string;
  instances: string;
  account: string;
}

function StatusCell({ status }: { status: OocStatus }) {
  const color = status === "Pending" ? "#F2D066" : "rgba(255,255,255,0.6)";
  return <span style={{ color }}>{status}</span>;
}


function EquipmentTypeCell({ row }: { row: OocRow }) {
  return <span className="text-foreground">{row.equipmentType}</span>;
}

export function OutOfCatalogTable({
  rows,
  visibleColumnIds,
  onReorderColumns,
  sortState,
  onToggleSort,
  filters,
  onFiltersChange,
  equipmentTypeOptions,
  onReviewRow,
}: {
  rows: OocRow[];
  visibleColumnIds: (ColumnMeta["id"])[];
  onReorderColumns: (ids: (ColumnMeta["id"])[]) => void;
  sortState: SortState;
  onToggleSort: (colId: string) => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  equipmentTypeOptions: string[];
  onReviewRow?: (row: OocRow) => void;
}) {
  const cols = visibleColumnIds
    .map((id) => ALL_OOC_COLUMNS.find((c) => c.id === id)!)
    .filter(Boolean);

  const [dragColId, setDragColId] = useState<string | null>(null);
  const [overColId, setOverColId] = useState<string | null>(null);
  const [overSide, setOverSide] = useState<"left" | "right">("left");
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const getColWidth = (col: ColumnMeta) => colWidths[col.id] ?? col.minWidth ?? 130;

  const startResize = (e: React.MouseEvent, col: ColumnMeta) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = getColWidth(col);
    const min = col.minWidth ?? 80;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(min, startW + (ev.clientX - startX));
      setColWidths((prev) => ({ ...prev, [col.id]: w }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleHeaderDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/col-id", id);
    setDragColId(id);
  };
  const handleHeaderDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? "left" : "right";
    setOverColId(id);
    setOverSide(side);
  };
  const handleHeaderDragEnd = () => {
    setDragColId(null);
    setOverColId(null);
  };
  const handleHeaderDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const src = e.dataTransfer.getData("text/col-id") || dragColId;
    const side = overSide;
    setDragColId(null);
    setOverColId(null);
    if (!src || src === targetId) return;
    const next = [...visibleColumnIds];
    const from = next.indexOf(src as ColumnMeta["id"]);
    let to = next.indexOf(targetId as ColumnMeta["id"]);
    if (from === -1 || to === -1) return;
    const [moved] = next.splice(from, 1);
    if (from < to) to -= 1;
    if (side === "right") to += 1;
    next.splice(to, 0, moved);
    onReorderColumns(next);
  };

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    onFiltersChange({ ...filters, [k]: v });

  const renderCell = (col: ColumnMeta, row: OocRow) => {
    switch (col.id) {
      case "detectedOn":
        return <span className="text-foreground">{row.detectedOn}</span>;
      case "status":
        return <StatusCell status={row.status} />;
      case "equipmentType":
        return <EquipmentTypeCell row={row} />;
      case "manufacturer":
        return <span className="text-foreground">{row.manufacturer}</span>;
      case "model":
        return <span className="text-foreground">{row.model}</span>;
      case "instances":
        return <span className="text-foreground">{row.instances}</span>;
      case "rackUnits":
        return <span className="text-foreground">{row.rackUnits ?? ""}</span>;
      case "account":
        return <span className="text-foreground">{row.account}</span>;
      case "link":
        return row.hasLink ? (
          <button
            type="button"
            aria-label="Open linked item"
            className="text-brand transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        ) : null;
      default:
        return null;
    }
  };

  const renderFilterCell = (col: ColumnMeta) => {
    switch (col.id) {
      case "status":
        return (
          <SelectFilter
            value={filters.status}
            onChange={(v) => setFilter("status", v as OocStatus | "")}
            options={[
              { value: "", label: "Select.." },
              { value: "Pending", label: "Pending" },
              { value: "Unrecognized", label: "Unrecognized" },
              
            ]}
          />
        );
      case "equipmentType":
        return (
          <SelectFilter
            value={filters.equipmentType}
            onChange={(v) => setFilter("equipmentType", v)}
            options={[
              { value: "", label: "Select..." },
              ...equipmentTypeOptions.map((o) => ({ value: o, label: o })),
            ]}
          />
        );
      case "manufacturer":
        return (
          <TextFilter
            value={filters.manufacturer}
            onChange={(v) => setFilter("manufacturer", v)}
          />
        );
      case "model":
        return <TextFilter value={filters.model} onChange={(v) => setFilter("model", v)} />;
      case "instances":
        return (
          <TextFilter value={filters.instances} onChange={(v) => setFilter("instances", v)} />
        );
      case "account":
        return <TextFilter value={filters.account} onChange={(v) => setFilter("account", v)} />;
      default:
        return null;
    }
  };

  return (
    <div className="custom-scrollbar overflow-auto rounded-lg border border-border bg-background [&_thead_th]:bg-[#121212]">
      <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-20 bg-[#121212]">
          <tr>
            {cols.map((col) => {
              const active = sortState?.colId === col.id;
              const isDragging = dragColId === col.id;
              const showInd = overColId === col.id && dragColId && dragColId !== col.id;
              const width = getColWidth(col);
              return (
                <th
                  key={col.id}
                  draggable
                  onDragStart={(e) => handleHeaderDragStart(e, col.id)}
                  onDragOver={(e) => handleHeaderDragOver(e, col.id)}
                  onDragEnd={handleHeaderDragEnd}
                  onDrop={(e) => handleHeaderDrop(e, col.id)}
                  style={{ width, minWidth: width }}
                  className={cn(
                    "group relative cursor-grab select-none border-b border-border px-3 py-3 text-left text-sm font-semibold text-white active:cursor-grabbing",
                    isDragging && "opacity-40",
                  )}
                >
                  {showInd && (
                    <div
                      className={cn(
                        "pointer-events-none absolute top-0 bottom-0 w-0.5 bg-brand",
                        overSide === "left" ? "left-0" : "right-0",
                      )}
                    />
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{col.label}</span>
                    {col.sortable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSort(col.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onDragStart={(e) => e.preventDefault()}
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] transition hover:bg-row-hover",
                          active
                            ? "text-brand"
                            : "text-white/70 opacity-0 group-hover:opacity-100",
                        )}
                      >
                        {active ? (
                          sortState!.dir === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <GripVertical className="h-3.5 w-3.5 text-white/40 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div
                    onMouseDown={(e) => startResize(e, col)}
                    onDragStart={(e) => e.preventDefault()}
                    draggable={false}
                    className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
                  >
                    <div className="mx-auto h-full w-px bg-brand/70" />
                  </div>
                </th>
              );
            })}
            <th className="border-b border-border px-3 py-3 text-right text-sm font-semibold text-white">
              Actions
            </th>
          </tr>
          {/* Per-column filter row */}
          <tr>
            {cols.map((col) => {
              const width = getColWidth(col);
              return (
                <th
                  key={col.id}
                  style={{ width, minWidth: width }}
                  className="border-b border-border px-2 py-2"
                >
                  {renderFilterCell(col)}
                </th>
              );
            })}
            <th className="border-b border-border px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="transition-colors hover:bg-row-hover"
              style={{
                color: "rgba(255, 255, 255, 0.87)",
                fontFamily: "Roboto, sans-serif",
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: "21px",
              }}
            >
              {cols.map((col) => (
                <td
                  key={col.id}
                  className="border-b border-border/60 px-4 py-3.5 align-middle"
                >
                  {renderCell(col, row)}
                </td>
              ))}
              <td className="border-b border-border/60 px-3 py-2 text-right align-middle">
                <button
                  type="button"
                  onClick={() => onReviewRow?.(row)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border-0 bg-white/[0.04] px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.08]"
                >
                  <Eye className="h-4 w-4 shrink-0" />
                  Review this Case
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={cols.length + 1}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                No entries match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TextFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex h-8 items-center rounded-md border border-border bg-background px-2.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative flex h-8 items-center rounded-md border border-border bg-background px-2.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent pr-4 text-xs font-normal text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}
