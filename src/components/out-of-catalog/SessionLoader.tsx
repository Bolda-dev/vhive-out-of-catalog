const STEPS = [
  "Gathering pending detections",
  "Sorting by confidence",
  "Preparing review session",
];

export function SessionLoader({ step = 0 }: { step?: number }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 px-8">
        {/* Animated hex / bee-ish dots */}
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "#3BB6E9",
              borderRightColor: "#3BB6E9",
              animation: "ooc-spin 1s linear infinite",
            }}
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "#F2D066",
              borderLeftColor: "#F2D066",
              animation: "ooc-spin 1.4s linear infinite reverse",
            }}
          />
          <div
            className="absolute inset-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "#3BB6E9", boxShadow: "0 0 16px #3BB6E9" }}
          />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <p
            className="text-base font-medium"
            style={{ color: "rgba(255,255,255,0.87)" }}
          >
            Starting Review Session
          </p>
          <p className="text-sm text-muted-foreground transition-opacity">
            {STEPS[Math.min(step, STEPS.length - 1)]}…
          </p>
        </div>

        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-8 rounded-full transition-colors"
              style={{
                background: i <= step ? "#3BB6E9" : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ooc-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
