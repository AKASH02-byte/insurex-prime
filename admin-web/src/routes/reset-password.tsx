import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { isApiConfigured, passwordResetApi } from "@/lib/api";

interface ResetSearch {
  token?: string | undefined;
  /** Which portal the email came from; only picks the wording and the sign-in tab. */
  role?: "agent" | "admin" | undefined;
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (raw: Record<string, unknown>): ResetSearch => ({
    token: typeof raw["token"] === "string" && raw["token"] ? raw["token"] : undefined,
    role: raw["role"] === "agent" ? "agent" : raw["role"] === "admin" ? "admin" : undefined,
  }),
  head: () => ({ meta: [{ title: "Reset Password — InsuroX Prime" }] }),
  component: ResetPasswordPage,
});

/**
 * Opened from the reset email. The reset happens on the button, not on page load, so mail
 * scanners that prefetch links cannot use up the single-use link.
 */
function ResetPasswordPage() {
  const { token, role } = Route.useSearch();
  const portal = role === "agent" ? "agent" : role === "admin" ? "admin" : "";
  const confirm = useMutation({ mutationFn: () => passwordResetApi.confirm(token!) });

  return (
    <div className="site-shell login-grid flex min-h-screen flex-col items-center justify-center px-4 py-10 text-foreground">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background/90 p-7 shadow-nav backdrop-blur-xl sm:p-9">
        {confirm.isSuccess ? (
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
              {portal ? `${portal[0]!.toUpperCase()}${portal.slice(1)} p` : "P"}assword reset
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with the temporary password from the email. You will be asked to choose a new
              password right away.
            </p>
            <Button asChild className="mt-6 h-11 w-full rounded-xl">
              <Link to="/login" search={{ role }}>
                Go to {portal ? `${portal} ` : ""}sign in
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-6" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
              Reset your {portal ? `${portal} ` : ""}password?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirm to replace your current password with the temporary password shown in the
              email. Until you confirm, your current password keeps working.
            </p>
            {!token ? (
              <p role="alert" className="mt-4 text-sm font-medium text-destructive">
                This link is incomplete. Open the link from the email again, or request a new one.
              </p>
            ) : !isApiConfigured ? (
              <p role="alert" className="mt-4 text-sm font-medium text-destructive">
                The API is not configured, so the reset cannot be completed.
              </p>
            ) : (
              <>
                {confirm.error != null && (
                  <p
                    role="alert"
                    className="mt-4 flex items-start gap-1.5 text-sm font-medium text-destructive"
                  >
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                    {confirm.error instanceof Error
                      ? confirm.error.message
                      : "The password could not be reset."}
                  </p>
                )}
                <Button
                  onClick={() => confirm.mutate()}
                  disabled={confirm.isPending}
                  className="mt-6 h-11 w-full rounded-xl"
                >
                  {confirm.isPending && <Loader2 className="animate-spin" />}
                  {confirm.isPending ? "Resetting…" : "Reset my password"}
                </Button>
              </>
            )}
            <Link
              to="/login"
              search={{ role }}
              className="mt-4 block text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
