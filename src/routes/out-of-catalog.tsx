import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Play, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/out-of-catalog/TopBar";
import { Pagination } from "@/components/out-of-catalog/Pagination";
import {
  OutOfCatalogTable,
  ALL_OOC_COLUMNS,
  DEFAULT_VISIBLE_COLUMN_IDS,
  getRowSortValue,
  type SortState,
  type ColumnMeta,
} from "@/components/out-of-catalog/OutOfCatalogTable";
import { mockOutOfCatalog } from "@/data/mockOutOfCatalog";
import type { OocRow, OocStatus } from "@/data/outOfCatalogTypes";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/out-of-catalog")({
  head: () => ({
    meta: [
      { title: "Out-of-Catalog Management — vHive" },
      {
        name: "description",
        content:
          "Review, bind, and manage out-of-catalog equipment detections from vHive scans.",
      },
      { property: "og:title", content: "Out-of-Catalog Management — vHive" },
      {
        property: "og:description",
        content:
          "Review, bind, and manage out-of-catalog equipment detections from vHive scans.",
      },
      { property: "og:url", content: "/out-of-catalog" },
    ],
    links: [{ rel: "canonical", href: "/out-of-catalog" }],
  }),
  component: OutOfCatalogPage,
});

interface Filters {
  status: OocStatus | "";
  equipmentType: string;
  manufacturer: string;
  model: string;
  instances: string;
  account: string;
}

const EMPTY_FILTERS: Filters = {
  status: "",
  equipmentType: "",
  manufacturer: "",
  model: "",
  instances: "",
  account: "",
};

function OutOfCatalogPage() {
  const navigate = useNavigate();
  const [rows] = useState<OocRow[]>(mockOutOfCatalog);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortState, setSortState] = useState<SortState>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [visibleColumnIds, setVisibleColumnIds] = useState<ColumnMeta["id"][]>(
    DEFAULT_VISIBLE_COLUMN_IDS,
  );

  const equipmentTypeOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.equipmentType))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let out = rows.filter((r) => {
      if (filters.status && r.status !== filters.status) return false;
      if (filters.equipmentType && r.equipmentType !== filters.equipmentType) return false;
      if (
        filters.manufacturer &&
        !r.manufacturer.toLowerCase().includes(filters.manufacturer.toLowerCase())
      )
        return false;
      if (filters.model && !r.model.toLowerCase().includes(filters.model.toLowerCase()))
        return false;
      if (
        filters.instances &&
        !String(r.instances).includes(filters.instances.trim())
      )
        return false;
      if (
        filters.account &&
        !r.account.toLowerCase().includes(filters.account.toLowerCase())
      )
        return false;
      return true;
    });

    if (sortState) {
      const { colId, dir } = sortState;
      out = [...out].sort((a, b) => {
        const va = getRowSortValue(a, colId);
        const vb = getRowSortValue(b, colId);
        if (typeof va === "number" && typeof vb === "number") return va - vb;
        return String(va).localeCompare(String(vb), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
      if (dir === "desc") out.reverse();
    }
    return out;
  }, [rows, filters, sortState]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const fromIdx = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIdx = Math.min(currentPage * pageSize, filtered.length);

  const toggleSort = (colId: string) => {
    setSortState((prev) => {
      if (!prev || prev.colId !== colId) return { colId, dir: "asc" };
      if (prev.dir === "asc") return { colId, dir: "desc" };
      return null;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar activeTab="out-of-catalog" />
      <main className="w-full px-6 py-6">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing <span className="text-foreground">{fromIdx}</span> to{" "}
            <span className="text-foreground">{toIdx}</span> of{" "}
            <span className="text-foreground">{filtered.length}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/review-session" })}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-background transition-colors hover:bg-brand/90"
            >
              <Play className="h-4 w-4" />
              Start Session
            </button>
            <button
              type="button"
              onClick={() => toast.success("Auto-Bind run started")}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-normal transition-colors hover:bg-white/[0.04]"
              style={{ borderColor: "#E0E0E0", color: "#E0E0E0" }}
            >
              <Wand2 className="h-4 w-4" style={{ color: "#E0E0E0" }} />
              Auto-Bind Attempt
            </button>
          </div>
        </div>

        <OutOfCatalogTable
          rows={pageRows}
          visibleColumnIds={visibleColumnIds}
          onReorderColumns={setVisibleColumnIds}
          sortState={sortState}
          onToggleSort={toggleSort}
          filters={filters}
          onFiltersChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
          equipmentTypeOptions={equipmentTypeOptions}
        />

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </main>
      <Toaster />
    </div>
  );
}
