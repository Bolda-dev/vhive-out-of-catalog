export function ConfidenceBadge({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const { bg, fg } =
    value < 50
      ? { bg: "rgba(239,68,68,0.16)", fg: "#EF4444" }
      : value <= 80
        ? { bg: "rgba(245,158,11,0.16)", fg: "#F59E0B" }
        : { bg: "rgba(34,197,94,0.16)", fg: "#22C55E" };
  const sizing =
    size === "md"
      ? "px-3 py-1 text-sm"
      : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium tabular-nums ${sizing}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {value}%
    </span>
  );
}
