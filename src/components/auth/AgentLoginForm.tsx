import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  Hash,
  Info,
  Loader2,
  Lock,
  ServerOff,
  ShieldAlert,
  User,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { endAdminSession } from "@/lib/admin-auth";
import { rememberAgentSignIn } from "@/lib/agent-session";
import { agentAuthApi, ApiError, isApiConfigured } from "@/lib/api";
import { signOutFromGoogle } from "@/lib/firebase-client";

/** Mirrors the backend checks so most mistakes are caught before a request. */
function validateIdentifier(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return "Enter your agent code, phone number or email.";
  if (value.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : "Enter a valid email address.";
  }
  if (/^\+?[\d\s-]{7,20}$/.test(value)) return undefined;
  if (!/^[A-Za-z0-9-]{3,32}$/.test(value)) {
    return "Enter your agent code (e.g. AGT-DEMO1), phone number or email.";
  }
  return undefined;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Sign-in failed. Please try again.";
}

export function AgentLoginForm() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [identifierError, setIdentifierError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const trimmed = identifier.trim();
  const IdentifierIcon = !trimmed ? User : trimmed.includes("@") ? AtSign : Hash;

  if (!isApiConfigured) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <ServerOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground">Agent sign-in is not connected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The agent workspace needs the InsureX API. Ask your administrator to set{" "}
            <code>VITE_API_BASE_URL</code>.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSigningIn) return;
    const idProblem = validateIdentifier(identifier);
    const pwProblem = password ? undefined : "Enter your password.";
    setIdentifierError(idProblem);
    setPasswordError(pwProblem);
    setFormError(undefined);
    if (idProblem || pwProblem) return;

    setIsSigningIn(true);
    try {
      // One signed-in identity per browser: drop any Super Admin session first.
      await Promise.allSettled([signOutFromGoogle(), endAdminSession()]);
      const session = await agentAuthApi.login(trimmed, password);
      rememberAgentSignIn();
      setPassword("");
      if (session.user.mustChangePassword) {
        toast.info("Please set a new password to continue.");
        await navigate({ to: "/agent/change-password" });
      } else {
        toast.success(`Welcome back, ${session.user.agent?.fullName ?? "agent"}.`);
        await navigate({ to: "/agent/dashboard" });
      }
    } catch (error) {
      setFormError(errorMessage(error));
      setPassword("");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label
            htmlFor="agent-identifier"
            className="text-xs font-bold uppercase tracking-wider text-foreground"
          >
            Agent ID / Phone / Email
          </Label>
          <span className="text-[11px] font-medium text-muted-foreground">e.g. AGT-DEMO1</span>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <IdentifierIcon className="size-4" />
          </div>
          <Input
            id="agent-identifier"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
              if (identifierError) setIdentifierError(validateIdentifier(event.target.value));
              setFormError(undefined);
            }}
            onBlur={() => identifier && setIdentifierError(validateIdentifier(identifier))}
            placeholder="Agent code, phone or email"
            aria-invalid={Boolean(identifierError)}
            aria-describedby={identifierError ? "agent-identifier-error" : undefined}
            className={`h-12 rounded-xl bg-background pl-10 pr-4 text-sm ${
              identifierError ? "border-destructive focus-visible:ring-destructive/30" : ""
            }`}
          />
        </div>
        {identifierError && (
          <p
            id="agent-identifier-error"
            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive"
          >
            <ShieldAlert className="size-3.5 shrink-0" />
            <span>{identifierError}</span>
          </p>
        )}
      </div>

      <div>
        <Label
          htmlFor="agent-password"
          className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground"
        >
          Password
        </Label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Lock className="size-4" />
          </div>
          <Input
            id="agent-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordError(undefined);
              setFormError(undefined);
            }}
            placeholder="Your password"
            maxLength={128}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "agent-password-error" : undefined}
            className={`h-12 rounded-xl bg-background pl-10 pr-11 text-sm ${
              passwordError ? "border-destructive focus-visible:ring-destructive/30" : ""
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {passwordError && (
          <p
            id="agent-password-error"
            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive"
          >
            <ShieldAlert className="size-3.5 shrink-0" />
            <span>{passwordError}</span>
          </p>
        )}
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-px size-3 shrink-0" />
          First time? Use the temporary password from your Super Admin — you'll choose your own
          next.
        </p>
      </div>

      {formError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <ShieldAlert className="size-3.5 shrink-0" />
          <span>{formError}</span>
        </p>
      )}

      <Button type="submit" disabled={isSigningIn} className="h-12 w-full rounded-xl font-semibold">
        {isSigningIn ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        <span>{isSigningIn ? "Signing in..." : "Sign in to Agent Workspace"}</span>
      </Button>
    </form>
  );
}
