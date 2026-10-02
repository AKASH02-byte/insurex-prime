import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/agent/ChangePasswordForm";
import { useAgentSession } from "@/components/agent/agent-session-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agent/change-password")({
  head: () => ({ meta: [{ title: "Set your password — InsureX Prime" }] }),
  component: ForcedPasswordChangePage,
});

/** Shown after signing in with a temporary password; the layout keeps the agent here. */
function ForcedPasswordChangePage() {
  const { agent, signOut } = useAgentSession();
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <ShieldCheck className="size-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
        Set your own password
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome, {agent.fullName} ({agent.agentCode}). You signed in with a temporary password.
        Choose a new one to open your workspace.
      </p>
      <div className="mt-6">
        <ChangePasswordForm
          currentLabel="Temporary password"
          submitLabel="Save and continue"
          onChanged={() => void navigate({ to: "/agent/dashboard", replace: true })}
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void signOut()}
        className="mt-4 w-full rounded-xl text-muted-foreground"
      >
        <LogOut /> Sign out
      </Button>
    </div>
  );
}
