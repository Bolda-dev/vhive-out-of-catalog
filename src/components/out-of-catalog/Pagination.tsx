import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Pagination({
  page,
  totalPages,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}) {
  const windowSize = 5;
  const start = Math.max(1, Math.min(page - 2, totalPages - windowSize + 1));
  const pages = Array.from(
    { length: Math.min(windowSize, totalPages) },
    (_, i) => start + i,
  );

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <IconBtn onClick={() => onPage(1)} disabled={page === 1}>
        <ChevronsLeft className="h-4 w-4" />
      </IconBtn>
      <IconBtn onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>
        <ChevronLeft className="h-4 w-4" />
      </IconBtn>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPage(p)}
          className={cn(
            "h-8 w-8 rounded-md text-sm transition-colors",
            page === p
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:bg-row-hover hover:text-foreground",
          )}
        >
          {p}
        </button>
      ))}
      <IconBtn
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </IconBtn>
      <IconBtn onClick={() => onPage(totalPages)} disabled={page === totalPages}>
        <ChevronsRight className="h-4 w-4" />
      </IconBtn>
      <div className="ml-4">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-[72px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function IconBtn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...p}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-row-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
