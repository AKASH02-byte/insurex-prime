import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Users, LayoutDashboard, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard")({
  head: () => ({
    meta: [
      { title: "Agent Dashboard — InsureX Prime" },
      { name: "description", content: "InsureX Agent workspace and customer portal." },
    ],
  }),
  component: AgentDashboardPlaceholder,
});

function AgentDashboardPlaceholder() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <header className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Users className="size-5" />
            </span>
            <span className="font-display text-lg font-extrabold">InsureX</span>
            <span className="rounded-full bg-signal/30 px-2.5 py-0.5 text-xs font-semibold text-foreground">
              Agent Workspace
            </span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Login
          </Link>
        </div>
      </header>

      <section className="mx-auto my-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-signal/20 text-foreground mb-6 shadow-sm">
          <LayoutDashboard className="size-8" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground mb-4">
          <CheckCircle2 className="size-3.5 text-signal" /> Authenticated as Agent
        </div>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Agent Dashboard</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Welcome to the InsureX Agent workspace. Customer policy renewals, active quotes, claims
          processing, and commission metrics will be available here.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4" /> Switch Role / Login
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Landing Page
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © 2026 InsureX Prime • Agent Session Demo
      </footer>
    </main>
  );
}
