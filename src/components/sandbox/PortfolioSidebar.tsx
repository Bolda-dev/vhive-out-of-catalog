import { Zap, ChevronDown } from "lucide-react";

type Severity = {
  id: string;
  label: string;
  count: number;
  color: string;
};

const SEVERITIES: Severity[] = [
  { id: "critical", label: "Critical", count: 8, color: "#EF4444" },
  { id: "major", label: "Major", count: 2, color: "#F59E0B" },
  { id: "minor", label: "Minor", count: 0, color: "#F2D066" },
  { id: "warning", label: "Warning", count: 5, color: "#3BB6E9" },
  { id: "information", label: "Information", count: 7, color: "#E5E7EB" },
  { id: "none", label: "None", count: 100, color: "rgba(255,255,255,0.25)" },
];

const FILTERS: { id: string; label: string; unit?: string }[] = [
  { id: "section", label: "Section Size", unit: "ha" },
  { id: "power", label: "Power Output", unit: "MW" },
  { id: "issues", label: "Number of Issues" },
  { id: "loss", label: "Power Loss Est.", unit: "KWh" },
  { id: "modules", label: "Affected Modules" },
];

function Checkbox() {
  return (
    <span
      aria-hidden
      className="inline-block h-[15px] w-[15px] shrink-0 rounded-[3px] border"
      style={{ borderColor: "rgba(255,255,255,0.35)", background: "transparent" }}
    />
  );
}

export function PortfolioSidebar() {
  return (
    <aside
      className="flex w-[300px] shrink-0 flex-col rounded-md border border-white/[0.06] bg-[#1E1E1E] p-3"
      style={{ fontFamily: "Roboto, sans-serif" }}
    >
      {/* Total Capacity — animated traveling stroke outline */}
      <div className="animated-outline-card relative rounded-[8px] border border-white/[0.04]">
        <svg className="outline-svg" preserveAspectRatio="none" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect
              key={i}
              x="0"
              y="0"
              width="100%"
              height="100%"
              rx="8"
              ry="8"
              pathLength={1000}
              style={{ animationDelay: `${-i * 0.035}s` }}
            />
          ))}
          <rect
            className="glow"
            x="0"
            y="0"
            width="100%"
            height="100%"
            rx="8"
            ry="8"
            pathLength={1000}
          />
        </svg>
        <div className="relative flex items-center gap-4 rounded-[8px] bg-[#1E1E1E] px-5 py-4">

          <div
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full"
            style={{ border: "1.5px solid #34D399" }}
          >
            <Zap className="h-5 w-5" style={{ color: "#34D399" }} />
          </div>
          <div className="min-w-0">
            <div className="text-[28px] font-bold leading-8 text-white">127MW</div>
            <div className="mt-1 text-[13px] text-white/85">Total Capacity</div>
            <div className="text-[12px] text-white/60">Across 6 Wind Farms</div>
          </div>
        </div>
      </div>

      {/* Issues counters */}
      <div className="mt-4 rounded-[6px] bg-[#232323] px-4 py-6">
        <div className="grid grid-cols-2 divide-x divide-white/10 text-center">
          <div>
            <div className="text-[32px] font-semibold leading-none text-white">128</div>
            <div className="mt-2 text-[13px] text-white/80">Open Issues</div>
          </div>
          <div>
            <div className="text-[32px] font-semibold leading-none" style={{ color: "#F0A8A2" }}>
              17
            </div>
            <div className="mt-2 text-[13px] text-white/80">Critical Issues</div>
          </div>
        </div>
      </div>

      {/* Issues header + Severity/Types tabs */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-[14px] font-semibold text-white">Issues</span>
        <span className="text-[14px] text-white/70">122</span>
      </div>

      <div className="mt-3 grid grid-cols-2 rounded-md bg-[#2A2A2A] p-1">
        <button
          type="button"
          className="rounded-[4px] bg-[#E5E7EB] py-2 text-[13px] font-semibold text-[#121212]"
        >
          Severity
        </button>
        <button type="button" className="py-2 text-[13px] text-white/80">
          Types
        </button>
      </div>

      {/* Severity list */}
      <ul className="mt-3 space-y-0.5">
        {SEVERITIES.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-1 py-1.5">
            <span
              className="h-[18px] w-[3px] rounded-sm"
              style={{ background: s.color }}
            />
            <Checkbox />
            <span className="flex-1 text-[13px] text-white/90">{s.label}</span>
            <span className="text-[12px] text-white/60 tabular-nums">{s.count}</span>
          </li>
        ))}
      </ul>

      {/* Last Surveyed */}
      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="text-[13px] font-semibold text-white">Last Surveyed</div>
        <button
          type="button"
          className="mt-2 flex h-9 w-full items-center justify-between rounded-md border border-white/10 bg-transparent px-3 text-[13px] text-white/70"
        >
          <span>All</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
      </div>

      {/* Filters */}
      <div className="mt-5">
        <div className="text-[13px] font-semibold text-white">Filters</div>
        <ul className="mt-3 space-y-2">
          {FILTERS.map((f) => (
            <li key={f.id} className="flex items-center gap-3">
              <Checkbox />
              <span className="flex-1 text-[13px] text-white/90">{f.label}</span>
              <span className="text-white/50">&gt;</span>
              <div className="flex h-8 w-[74px] items-center justify-between rounded-md border border-white/15 px-2 text-[12px]">
                <span className="text-white/90">0</span>
                {f.unit && <span className="text-white/50">{f.unit}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
