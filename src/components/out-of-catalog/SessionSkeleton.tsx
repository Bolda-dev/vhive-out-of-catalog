export function SessionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}
      >
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <style>{`
        @keyframes ooc-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .ooc-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.03) 0%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.03) 100%
          );
          background-size: 800px 100%;
          animation: ooc-shimmer 1.4s linear infinite;
        }
      `}</style>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex h-[560px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="h-9 shrink-0 border-b border-border/60 px-3 py-2">
        <div className="ooc-shimmer h-4 w-40 rounded" />
      </div>
      <div className="ooc-shimmer flex-1" />
      <div className="h-[196px] shrink-0 border-t border-border/60 p-2">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ooc-shimmer h-[160px] w-[200px] shrink-0 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
