import { createFileRoute } from "@tanstack/react-router";
import { PortfolioSidebar } from "@/components/sandbox/PortfolioSidebar";

export const Route = createFileRoute("/sandbox")({
  head: () => ({
    meta: [
      { title: "Sandbox — vHive" },
      { name: "description", content: "Component sandbox for previewing vHive UI pieces in isolation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SandboxPage,
});

function SandboxPage() {
  return (
    <div className="min-h-screen bg-[#121212] p-8 text-white">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Sandbox</h1>
        <p className="text-sm text-white/60">
          Preview components in isolation before wiring them into the app.
        </p>
      </div>

      <section className="rounded-lg border border-white/[0.06] bg-[#181818] p-6">
        <div className="mb-4 text-xs uppercase tracking-wider text-white/50">
          Portfolio Sidebar
        </div>
        <PortfolioSidebar />
      </section>
    </div>
  );
}
