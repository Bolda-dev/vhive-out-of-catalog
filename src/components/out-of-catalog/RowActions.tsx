import { ChevronDown, Globe, HelpCircle, Wand2 } from "lucide-react";
import type { OocRow } from "@/data/outOfCatalogTypes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BTN =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function RowActions({ row }: { row: OocRow }) {
  const isUnrecognized = row.status === "Unrecognized";

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => toast.success(`Added new & bound: ${row.equipmentType}`)}
        className={cn(BTN, "text-foreground hover:bg-row-hover")}
      >
        <Wand2 className="h-3.5 w-3.5 text-brand" />
        Add New &amp; Bind
      </button>
      <button
        type="button"
        onClick={() => toast.success(`Bind to existing: ${row.equipmentType}`)}
        className={cn(BTN, "text-foreground hover:bg-row-hover")}
      >
        <Globe className="h-3.5 w-3.5 text-brand" />
        Bind to Existing
      </button>
      <button
        type="button"
        disabled={isUnrecognized}
        onClick={() => toast(`Marked as Unrecognized: ${row.equipmentType}`)}
        className={cn(BTN, "text-foreground hover:bg-row-hover")}
      >
        <HelpCircle className="h-3.5 w-3.5 text-brand" />
        Mark as Unrecognized
      </button>
      <button
        type="button"
        aria-label="More"
        className="flex h-8 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-row-hover hover:text-foreground"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
