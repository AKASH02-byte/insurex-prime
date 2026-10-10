import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/agent/ChangePasswordForm";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { currentUserKey, useCurrentUser } from "@/hooks/use-current-user";
import { useAdminSignOut } from "@/hooks/use-admin-sign-out";
import { requireTenantAdminAnyState } from "@/lib/admin-route-guard";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/change-password")({
  ssr: false,
  beforeLoad: requireTenantAdminAnyState,
  head: () => ({ meta: [{ title: "Set your password — InsuroX Prime" }] }),
  component: ForcedPasswordChangePage,
});

/** Shown after a tenant admin signs in with the temporary password issued at activation. */
function ForcedPasswordChangePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const { signOut, isSigningOut } = useAdminSignOut();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface/30 px-4 py-10">
      <Toaster position="top-right" richColors />
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
          Set your own password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {me?.tenant ? `Welcome to ${me.tenant.name}. ` : "Welcome. "}
          You signed in with a temporary password. Choose a new one to open your admin workspace.
        </p>
        <div className="mt-6">
          <ChangePasswordForm
            currentLabel="Temporary password"
            submitLabel="Save and continue"
            onChanged={(user) => {
              queryClient.setQueryData(currentUserKey, user);
              void navigate({ to: "/admin/dashboard", replace: true });
            }}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={isSigningOut}
          onClick={() => void signOut()}
          className="mt-4 w-full rounded-xl text-muted-foreground"
        >
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );
}
