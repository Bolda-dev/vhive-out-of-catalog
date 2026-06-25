import { Menu } from "lucide-react";
import logoAsset from "@/assets/vhive-logo.png.asset.json";
import faviconChevrons from "@/assets/favicon-chevrons.png";
import { cn } from "@/lib/utils";

type TabId = "equipment" | "out-of-catalog" | "civil-survey";

const TABS: { id: TabId; label: string }[] = [
  { id: "equipment", label: "Equipment" },
  { id: "out-of-catalog", label: "Out-of-catalog Management" },
  { id: "civil-survey", label: "Civil Survey Categories" },
];

export function TopBar({ activeTab = "out-of-catalog" as TabId }: { activeTab?: TabId }) {
  return (
    <header className="flex h-[68px] items-center justify-between border-b border-border bg-card px-8">
      <div className="flex h-full items-center gap-10">
        <div className="flex items-center gap-3">
          <img src={faviconChevrons} alt="" className="h-7 w-auto" />
          <img src={logoAsset.url} alt="vHive" className="h-8 w-auto" />
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
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-row-hover hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
