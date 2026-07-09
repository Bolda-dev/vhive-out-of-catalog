import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { unlockSite } from "@/lib/gate.functions";
import logoAsset from "@/assets/vhive-logo.png.asset.json";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Enter password — vHive" },
      { name: "description", content: "Password-protected preview." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const { ok } = await unlock({ data: { password } });
      if (ok) {
        await router.navigate({ to: "/out-of-catalog" });
      } else {
        setError(true);
        setPassword("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src={logoAsset.url} alt="vHive" className="h-9 w-auto" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
          <h1 className="text-lg font-medium text-foreground">
            Password required
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the password to view this preview.
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
            />
            {error && (
              <p className="text-sm text-red-400">Incorrect password</p>
            )}
            <button
              type="submit"
              disabled={submitting || !password}
              className="h-10 w-full rounded-md bg-brand text-sm font-medium text-background transition-colors hover:bg-brand/90 disabled:opacity-50"
            >
              {submitting ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
