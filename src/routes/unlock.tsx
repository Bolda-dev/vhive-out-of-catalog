import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import logoAsset from "@/assets/vhive-logo.png.asset.json";

export const Route = createFileRoute("/unlock")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: search.error === "1",
  }),
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
  const search = Route.useSearch();
  const [error, setError] = useState(search.error);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (!password || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const response = await fetch("/api/public/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const { ok } = (await response.json()) as { ok?: boolean };
      if (ok) {
        await router.navigate({ to: "/out-of-catalog" });
      } else {
        setError(true);
        e.currentTarget.reset();
      }
    } catch {
      setError(true);
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
          <form
            method="post"
            action="/api/public/unlock"
            onSubmit={onSubmit}
            className="mt-5 space-y-3"
          >
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              placeholder="Password"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
            />
            {error && (
              <p className="text-sm text-red-400">Incorrect password</p>
            )}
            <button
              type="submit"
              disabled={submitting}
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
