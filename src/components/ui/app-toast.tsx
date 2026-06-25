import { toast } from "sonner";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "info" | "success" | "error";

type AppToastOptions = {
  title: string;
  description?: ReactNode;
  variant?: Variant;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

const VARIANT_STYLES: Record<Variant, { bg: string; border: string; accent: string; subText: string }> = {
  info: { bg: "#D6F0FA", border: "#3BB6E9", accent: "#3BB6E9", subText: "#3a4148" },
  success: { bg: "#D6F0FA", border: "#3BB6E9", accent: "#3BB6E9", subText: "#3a4148" },
  error: { bg: "#FBE2E0", border: "#D9534F", accent: "#D9534F", subText: "#4a2522" },
};

export function appToast({
  title,
  description,
  variant = "info",
  duration = 4000,
  action,
}: AppToastOptions) {
  const s = VARIANT_STYLES[variant];
  const Icon = variant === "error" ? AlertCircle : CheckCircle2;

  return toast.custom(
    (t) => (
      <div
        className="flex w-[460px] items-center gap-3 overflow-hidden rounded-md pr-4 py-3 shadow-lg"
        style={{ background: s.bg, color: "#1c2127", borderLeft: `4px solid ${s.border}` }}
      >
        <Icon className="ml-4 h-7 w-7 shrink-0" style={{ color: s.accent }} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight">{title}</div>
          {description ? (
            <div className="mt-0.5 text-sm leading-tight" style={{ color: s.subText }}>
              {description}
            </div>
          ) : null}
        </div>
        {action ? (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              toast.dismiss(t);
            }}
            className="shrink-0 rounded px-2 py-1 text-sm font-medium text-black transition hover:bg-black/5"
          >
            {action.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => toast.dismiss(t)}
          aria-label="Close"
          className="shrink-0 rounded p-1 transition hover:bg-black/5"
          style={{ color: s.accent }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ),
    { duration },
  );
}
