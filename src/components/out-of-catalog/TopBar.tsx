import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "equipment" | "out-of-catalog" | "civil-survey";

const TABS: { id: TabId; label: string }[] = [
  { id: "equipment", label: "Equipment" },
  { id: "out-of-catalog", label: "Out-of-catalog Management" },
  { id: "civil-survey", label: "Civil Survey Categories" },
];

export function TopBar({ activeTab = "out-of-catalog" as TabId }: { activeTab?: TabId }) {
  return (
    <header className="flex h-[68px] items-center justify-between border-b border-border bg-card px-6">
      <div className="flex h-full items-center gap-10">
        {/* Logo — vHive-style stacked arrows */}
        <div className="flex items-center gap-2">
          <svg
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="vHive"
          >
            <path d="M6 6 L17 19 L28 6" stroke="hsl(217 91% 65%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 15 L17 28 L28 15" stroke="hsl(217 91% 65%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-base font-semibold tracking-tight text-foreground">
            vHive
          </span>
        </div>

        <nav className="flex h-full items-stretch gap-1 text-sm">
          {TABS.map((t) => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                type="button"
                className={cn(
                  "relative flex items-center px-4 transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {active && (
                  <span className="pointer-events-none absolute inset-x-3 -bottom-px h-[3px] rounded-t-sm bg-brand" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-foreground">Barel</span>
        <button
          type="button"
          aria-label="Menu"
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-row-hover hover:text-foreground"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
