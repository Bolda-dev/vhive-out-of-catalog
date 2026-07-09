import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireUnlocked } from "@/lib/gate.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    await requireUnlocked();
    throw redirect({ to: "/out-of-catalog" });
  },
});
