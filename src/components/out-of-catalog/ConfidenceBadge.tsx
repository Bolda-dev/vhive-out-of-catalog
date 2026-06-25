export function ConfidenceBadge({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const { bg, fg } =
    value < 50
      ? { bg: "rgba(220,150,150,0.10)", fg: "#C98A8A" }
      : value <= 80
        ? { bg: "rgba(220,190,140,0.10)", fg: "#C9B07A" }
        : { bg: "rgba(150,200,170,0.10)", fg: "#8FBFA3" };
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
