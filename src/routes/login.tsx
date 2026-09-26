import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Chrome,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { signInWithPopup } from "firebase/auth";
import { exchangeFirebaseIdentity, getAdminSession } from "@/lib/admin-auth";
import { signOutFromGoogle } from "@/lib/firebase-client";
import { auth, googleProvider } from "@/lib/firebase";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (await getAdminSession()) throw redirect({ to: "/admin/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign In — InsureX Prime Portal" },
      {
        name: "description",
        content:
          "Secure role-based authentication portal for InsureX Super Administrators and Certified Agents.",
      },
      { property: "og:title", content: "Sign In — InsureX Prime Portal" },
      {
        property: "og:description",
        content:
          "Secure role-based authentication portal for InsureX Super Administrators and Certified Agents.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LoginPage,
});

type Role = "super_admin" | "agent";

function LoginPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("super_admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  // Form errors
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ identifier?: boolean; password?: boolean }>({});

  // Forgot password modal
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const isSuperAdmin = role === "super_admin";

  const validate = (field?: "identifier" | "password") => {
    const newErrors: { identifier?: string; password?: string } = { ...errors };

    if (!field || field === "identifier") {
      const trimmed = identifier.trim();
      if (!trimmed) {
        newErrors.identifier = isSuperAdmin
          ? "Please enter your Admin ID or registered email."
          : "Please enter your Agent ID or registered email.";
      } else if (trimmed.includes("@")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          newErrors.identifier = "Please enter a valid email address.";
        } else {
          delete newErrors.identifier;
        }
      } else if (trimmed.length < 3) {
        newErrors.identifier = "ID must be at least 3 characters long.";
      } else {
        delete newErrors.identifier;
      }
    }

    if (!field || field === "password") {
      if (!password) {
        newErrors.password = "Please enter your password.";
      } else if (password.length < 6) {
        newErrors.password = "Password must be at least 6 characters long.";
      } else {
        delete newErrors.password;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRoleChange = (newRole: Role) => {
    if (newRole === role) return;
    setRole(newRole);
    setErrors({});
    setTouched({});
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.error("Password sign-in is not connected. Use your authorized Google account.");
  };

  const handleGoogleSignIn = async () => {
    if (!isSuperAdmin) {
      toast.error("Google sign-in is currently available for Super Admin accounts only.");
      return;
    }

    setGoogleError("");
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;
      console.log(email);
      const idToken = await result.user.getIdToken();
      await exchangeFirebaseIdentity({ data: { idToken } });
      toast.success(`Signed in as ${email}.`);
      await navigate({ to: "/admin/dashboard" });
    } catch (error) {
      await signOutFromGoogle().catch(() => undefined);
      const message = error instanceof Error ? error.message : "Google sign-in failed.";
      setGoogleError(message);
      toast.error(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    setForgotSent(false);
    setForgotError("Password recovery is unavailable because password sign-in is not configured.");
  };

  return (
    <div className="site-shell min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <Toaster position="top-right" richColors />

      {/* Top Navigation Bar */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
        <nav
          aria-label="Login Header"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full border border-border/70 bg-background/80 px-4 shadow-nav backdrop-blur-xl sm:px-6"
        >
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-5" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">InsureX</span>
            <span className="hidden rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground sm:inline-block">
              Prime Portal
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:px-5 sm:text-sm"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Home</span>
          </Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="hero-field relative flex flex-1 items-center justify-center px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.12fr_.88fr] lg:gap-12">
          {/* Left Column: Login Card */}
          <div className="w-full">
            <div className="relative mx-auto w-full max-w-xl rounded-3xl border border-border/80 bg-background/95 p-6 shadow-nav backdrop-blur-2xl sm:p-10">
              {/* Header inside Card */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground mb-3">
                  <Sparkles className="size-3.5 text-signal" />
                  <span>Authorized Personnel Only</span>
                </div>
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  Welcome Back
                </h1>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Select your assigned role to access policy governance, client accounts, and the
                  InsureX management portal.
                </p>
              </div>

              {/* Role Selector Tabs */}
              <div className="mb-8">
                <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Select Access Level
                </label>
                <div
                  role="tablist"
                  aria-label="Authentication Role"
                  className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/50 p-1.5"
                >
                  <button
                    type="button"
                    role="tab"
                    id="role-super-admin"
                    aria-selected={isSuperAdmin}
                    onClick={() => handleRoleChange("super_admin")}
                    className={`relative flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isSuperAdmin
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    }`}
                  >
                    <span
                      className={`grid size-7 place-items-center rounded-lg transition-colors ${
                        isSuperAdmin
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Shield className="size-4" />
                    </span>
                    <span>Super Admin</span>
                    {isSuperAdmin && (
                      <span className="size-1.5 rounded-full bg-signal absolute right-3 top-3" />
                    )}
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="role-agent"
                    aria-selected={!isSuperAdmin}
                    onClick={() => handleRoleChange("agent")}
                    className={`relative flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      !isSuperAdmin
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    }`}
                  >
                    <span
                      className={`grid size-7 place-items-center rounded-lg transition-colors ${
                        !isSuperAdmin
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Users className="size-4" />
                    </span>
                    <span>Agent</span>
                    {!isSuperAdmin && (
                      <span className="size-1.5 rounded-full bg-signal absolute right-3 top-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={!isSuperAdmin || isGoogleLoading}
                  className="h-12 w-full rounded-xl font-semibold"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Chrome className="size-4" />
                  )}
                  <span>
                    {isGoogleLoading
                      ? "Verifying Google account..."
                      : isSuperAdmin
                        ? "Continue with Google"
                        : "Google sign-in is for Super Admins"}
                  </span>
                </Button>
                {googleError && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <ShieldAlert className="size-3.5 shrink-0" />
                    <span>{googleError}</span>
                  </p>
                )}
                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Password access unavailable
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* ID / Email Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label
                      htmlFor="identifier"
                      className="text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      {isSuperAdmin ? "Admin ID / Email" : "Agent ID / Email"}
                    </Label>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {isSuperAdmin
                        ? "e.g. ADM-9021 or admin@insurex.com"
                        : "e.g. AGT-4402 or agent@insurex.com"}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                      {identifier.includes("@") ? (
                        <Mail className="size-4" />
                      ) : isSuperAdmin ? (
                        <Shield className="size-4" />
                      ) : (
                        <User className="size-4" />
                      )}
                    </div>
                    <Input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (touched.identifier) validate("identifier");
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, identifier: true }));
                        validate("identifier");
                      }}
                      placeholder={
                        isSuperAdmin
                          ? "admin@insurex.com or Admin ID"
                          : "agent@insurex.com or Agent ID"
                      }
                      aria-invalid={Boolean(errors.identifier)}
                      aria-describedby={errors.identifier ? "identifier-error" : undefined}
                      className={`h-12 rounded-xl bg-background pl-10 pr-4 text-sm transition-all focus-visible:ring-2 ${
                        errors.identifier
                          ? "border-destructive focus-visible:ring-destructive/30"
                          : "border-input focus-visible:border-primary focus-visible:ring-primary/20"
                      }`}
                    />
                  </div>
                  {errors.identifier && (
                    <p
                      id="identifier-error"
                      className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive"
                    >
                      <ShieldAlert className="size-3.5 shrink-0" />
                      <span>{errors.identifier}</span>
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label
                      htmlFor="password"
                      className="text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotSent(false);
                        setForgotEmail(identifier.includes("@") ? identifier : "");
                        setForgotPasswordOpen(true);
                      }}
                      className="text-xs font-semibold text-primary transition-colors hover:text-primary/80 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                      <Lock className="size-4" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (touched.password) validate("password");
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, password: true }));
                        validate("password");
                      }}
                      placeholder="••••••••••••"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? "password-error" : undefined}
                      className={`h-12 rounded-xl bg-background pl-10 pr-11 text-sm transition-all focus-visible:ring-2 ${
                        errors.password
                          ? "border-destructive focus-visible:ring-destructive/30"
                          : "border-input focus-visible:border-primary focus-visible:ring-primary/20"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      id="password-error"
                      className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive"
                    >
                      <ShieldAlert className="size-3.5 shrink-0" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                {/* Submit Login Button */}
                <div className="pt-2">
                  <Button type="submit" variant="outline" className="w-full rounded-xl text-xs">
                    Password sign-in is not connected
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Branded Security & Operational Feature Panel */}
          <div className="hidden lg:block">
            <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-surface/70 p-8 shadow-nav backdrop-blur-xl xl:p-10">
              {/* Decorative Glow */}
              <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />

              {/* Role Status Badge */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    {isSuperAdmin ? <Shield className="size-5" /> : <Users className="size-5" />}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      Gateway Target
                    </p>
                    <p className="font-display font-bold text-foreground">
                      {isSuperAdmin ? "Super Admin Portal" : "Certified Agent Workspace"}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-signal/20 px-3 py-1 text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-signal animate-pulse" />
                  Live System
                </span>
              </div>

              {/* Dynamic Role Highlights */}
              <div className="rounded-2xl border border-border/90 bg-background/80 p-6 mb-6 shadow-sm">
                <h3 className="font-display text-lg font-bold mb-2">
                  {isSuperAdmin
                    ? "Centralized Governance & Control"
                    : "Rapid Policy Issuance & Client Book"}
                </h3>
                <p className="text-xs leading-5 text-muted-foreground mb-4">
                  {isSuperAdmin
                    ? "Manage global health and motor product rules, underwriter sign-offs, agent commissioning, and regulatory compliance logs."
                    : "Serve motor and health policyholders, quote instant cover packages, verify customer identity, and submit expedited claims."}
                </p>

                <ul className="space-y-2.5 border-t border-border pt-4">
                  {(isSuperAdmin
                    ? [
                        "Automated destination: /admin/dashboard",
                        "Audit logging for every underwriting action",
                        "Enterprise role-based access delegation",
                      ]
                    : [
                        "Automated destination: /agent/dashboard",
                        "Live client quota and renewal alerts",
                        "Direct health & motor policy binding",
                      ]
                  ).map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 text-xs font-medium text-foreground"
                    >
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security Credential Badges */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="rounded-xl border border-border/70 bg-background/50 p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="size-4 text-primary" />
                    <span className="text-xs font-bold">256-Bit TLS</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    End-to-end encrypted transport across all sessions.
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/50 p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="size-4 text-primary" />
                    <span className="text-xs font-bold">ISO 27001 Ready</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Strict fintech data integrity and compliance.
                  </p>
                </div>
              </div>

              {/* Bottom Quote */}
              <div className="mt-8 border-t border-border pt-5 flex items-center justify-between text-xs text-muted-foreground">
                <span>InsureX Prime Authentication Suite</span>
                <span className="font-semibold text-foreground">v2.4.0</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-6 py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p>© 2026 InsureX Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="hover:text-foreground transition-colors">
              Public Homepage
            </Link>
            <span>•</span>
            <span className="text-muted-foreground/80">Support: 1-800-INSUREX</span>
          </div>
        </div>
      </footer>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              Reset Your Password
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Enter your registered administrative or agent email address to receive password
              recovery instructions.
            </DialogDescription>
          </DialogHeader>

          {forgotSent ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-signal/20 text-foreground">
                <CheckCircle2 className="size-6 text-foreground" />
              </div>
              <h4 className="font-bold text-foreground">Reset Link Dispatched</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                If an account exists for{" "}
                <span className="font-medium text-foreground">{forgotEmail}</span>, you will receive
                an email shortly with recovery steps.
              </p>
              <div className="mt-5">
                <Button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="rounded-full bg-primary text-primary-foreground px-6"
                >
                  Return to Login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 pt-2">
              <div>
                <Label
                  htmlFor="forgot-email"
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Registered Email
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. admin@insurex.com"
                    className="pl-9 h-11 rounded-xl"
                    required
                  />
                </div>
                {forgotError && (
                  <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                    <ShieldAlert className="size-3" /> {forgotError}
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="rounded-xl">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" className="rounded-xl bg-primary text-primary-foreground">
                  Send Recovery Link
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
