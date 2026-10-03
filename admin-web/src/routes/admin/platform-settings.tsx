import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Briefcase,
  Database,
  Loader2,
  LogOut,
  RefreshCw,
  ServerCog,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  ConfigStatusBadge,
  DEPLOYMENT_MANAGED,
  SettingsInput,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsToggle,
  SystemStatusCard,
  type StatusTone,
} from "@/components/admin/settings/SettingsComponents";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { useAdminSignOut } from "@/hooks/use-admin-sign-out";
import { requirePlatformSession } from "@/lib/admin-route-guard";
import {
  ApiError,
  authApi,
  isApiConfigured,
  retryUnlessClientError,
  settingsApi,
  type SettingKey,
  type SettingsValues,
  type SettingValue,
} from "@/lib/api";
import { CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/api/settings";
import { cn } from "@/lib/utils";
import { AdminFooter } from "@/components/admin/AdminFooter";

export const Route = createFileRoute("/admin/platform-settings")({
  ssr: false,
  beforeLoad: requirePlatformSession,
  head: () => ({
    meta: [{ title: "Platform Settings — InsuroX Prime" }],
  }),
  component: PlatformSettingsPage,
});

const SECTIONS = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "policy", label: "Policy & Sales", icon: Briefcase },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "system", label: "System & Integrations", icon: ServerCog },
  { id: "account", label: "Account", icon: UserCircle },
  { id: "data", label: "Data & Audit", icon: Database },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const settingsKey = ["admin", "settings"] as const;
const healthKey = ["admin", "settings", "health"] as const;
const meKey = ["admin", "settings", "me"] as const;

const GENERAL_KEYS: SettingKey[] = [
  "general.companyName",
  "general.supportEmail",
  "general.supportPhone",
  "general.currency",
  "general.timezone",
  "general.dateFormat",
];
const POLICY_KEYS: SettingKey[] = [
  "policy.allowAgentSales",
  "policy.defaultPaymentStatus",
  "policy.renewalRemindersEnabled",
  "policy.defaultRenewalReminderDays",
];

const CURRENCY_LABELS: Record<string, string> = {
  INR: "INR (₹)",
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  AED: "AED (د.إ)",
};

const toOptions = (values: readonly string[], labels?: Record<string, string>) =>
  values.map((value) => ({ value, label: labels?.[value] ?? value }));

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDuration(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [
    days && `${days}d`,
    (days || hours) && `${hours}h`,
    (days || hours || minutes) && `${minutes}m`,
    `${totalSeconds % 60}s`,
  ].filter(Boolean);
  return parts.slice(0, 3).join(" ");
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has ended. Please sign in again.";
    if (error.status === 403) return "Only a Super Admin can change settings.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function PlatformSettingsPage() {
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [section, setSection] = useState<SectionId>("general");
  const [draft, setDraft] = useState<Partial<SettingsValues>>({});
  const [pendingToggle, setPendingToggle] = useState<SettingKey | null>(null);

  const enabled = isApiConfigured && typeof window !== "undefined";
  const settingsQuery = useQuery({
    queryKey: settingsKey,
    queryFn: settingsApi.get,
    enabled,
    retry: retryUnlessClientError,
    refetchOnWindowFocus: false,
  });

  const saved = useMemo(
    () =>
      settingsQuery.data
        ? (Object.fromEntries(
            settingsQuery.data.items.map((item) => [item.key, item.value]),
          ) as unknown as SettingsValues)
        : null,
    [settingsQuery.data],
  );

  const save = useMutation({
    mutationFn: (changes: Partial<SettingsValues>) => settingsApi.update(changes),
    onSuccess: (data, changes) => {
      queryClient.setQueryData(settingsKey, data);
      setDraft((current) => {
        const next = { ...current };
        for (const key of Object.keys(changes) as SettingKey[]) delete next[key];
        return next;
      });
      toast.success("Settings saved");
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => setPendingToggle(null),
  });

  const handleAuthFailure = (error: unknown) => {
    if (!(error instanceof ApiError)) return null;
    if (error.status === 401 || error.status === 403) return error.status;
    return null;
  };

  const setValue = <K extends SettingKey>(key: K, value: SettingsValues[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const view = saved ? ({ ...saved, ...draft } as SettingsValues) : null;
  const dirtyKeys = (keys: SettingKey[]) =>
    saved ? keys.filter((key) => draft[key] !== undefined && draft[key] !== saved[key]) : [];
  const resetKeys = (keys: SettingKey[]) =>
    setDraft((current) => {
      const next = { ...current };
      for (const key of keys) delete next[key];
      return next;
    });
  const saveKeys = (keys: SettingKey[]) => {
    const changes: Record<string, SettingValue> = {};
    for (const key of dirtyKeys(keys)) changes[key] = draft[key] as SettingValue;
    save.mutate(changes as Partial<SettingsValues>);
  };

  const authStatus = handleAuthFailure(settingsQuery.error);
  let body: ReactNode;
  if (!isApiConfigured) {
    body = (
      <StatePanel
        title="Backend API not configured"
        message="Set VITE_API_BASE_URL so the settings page can reach the InsuroX API."
      />
    );
  } else if (authStatus === 403) {
    body = (
      <StatePanel
        title="Super Admin access required"
        message="Your account does not have permission to view or change system settings."
      />
    );
  } else if (authStatus === 401) {
    body = (
      <StatePanel
        title="Your session has ended"
        message="Sign in again to manage settings."
        action={
          <Button asChild size="sm">
            <Link to="/login">Go to sign in</Link>
          </Button>
        }
      />
    );
  } else if (settingsQuery.isError) {
    body = (
      <StatePanel
        title="Could not load settings"
        message={errorMessage(settingsQuery.error)}
        action={
          <Button size="sm" variant="outline" onClick={() => void settingsQuery.refetch()}>
            Try again
          </Button>
        }
      />
    );
  } else if (!view || !settingsQuery.data) {
    body = (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" /> Loading settings…
      </div>
    );
  } else {
    const meta = settingsQuery.data;
    body = (
      <>
        {section === "general" && (
          <GeneralSection
            view={view}
            setValue={setValue}
            dirty={dirtyKeys(GENERAL_KEYS)}
            saving={save.isPending}
            onSave={() => saveKeys(GENERAL_KEYS)}
            onReset={() => resetKeys(GENERAL_KEYS)}
            lastUpdatedAt={meta.lastUpdatedAt}
            lastUpdatedBy={meta.lastUpdatedBy}
          />
        )}
        {section === "notifications" && (
          <NotificationsSection
            view={view}
            pendingKey={save.isPending ? pendingToggle : null}
            onToggle={(key, checked) => {
              setPendingToggle(key);
              save.mutate({ [key]: checked } as Partial<SettingsValues>);
            }}
          />
        )}
        {section === "policy" && (
          <PolicySection
            view={view}
            setValue={setValue}
            dirty={dirtyKeys(POLICY_KEYS)}
            saving={save.isPending}
            onSave={() => saveKeys(POLICY_KEYS)}
            onReset={() => resetKeys(POLICY_KEYS)}
          />
        )}
        {section === "security" && <SecuritySection />}
        {section === "system" && <SystemSection />}
        {section === "account" && <AccountSection />}
        {section === "data" && (
          <DataSection
            onClearLocal={() => {
              setDraft({});
              queryClient.removeQueries({ queryKey: ["admin"], type: "inactive" });
              void queryClient.invalidateQueries({ queryKey: ["admin"] });
              toast.success("Unsaved changes and cached data cleared in this browser");
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface/30 text-foreground">
      <AdminSidebar
        currentPath="/admin/platform-settings"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-shell-pad flex flex-col min-h-screen">
        <AdminHeader onToggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl w-full mx-auto">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage platform configuration, security, notifications and system preferences.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
            <div className="lg:hidden">
              <Select value={section} onValueChange={(value) => setSection(value as SectionId)}>
                <SelectTrigger aria-label="Settings section" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <nav aria-label="Settings sections" className="hidden lg:block">
              <ul className="sticky top-28 space-y-1">
                {SECTIONS.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === section;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSection(item.id)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="min-w-0 space-y-6">{body}</div>
          </div>
        </main>
        <AdminFooter />
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function StatePanel({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-border/80 bg-background/90 p-8 text-center shadow-xs"
    >
      <h2 className="font-display text-base font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface FormProps {
  view: SettingsValues;
  setValue: <K extends SettingKey>(key: K, value: SettingsValues[K]) => void;
  dirty: SettingKey[];
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

function FormActions({
  dirty,
  saving,
  onSave,
  onReset,
  disabled,
}: Pick<FormProps, "dirty" | "saving" | "onSave" | "onReset"> & { disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        disabled={saving || dirty.length === 0}
      >
        Reset
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={onSave}
        disabled={saving || dirty.length === 0 || disabled}
      >
        {saving && <Loader2 className="size-3.5 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );
}

const unsavedNote = (dirty: SettingKey[]) =>
  dirty.length > 0 ? (
    <span className="text-xs font-medium text-amber-700">
      {dirty.length} unsaved change{dirty.length === 1 ? "" : "s"}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">All changes saved</span>
  );

function GeneralSection({
  view,
  setValue,
  dirty,
  saving,
  onSave,
  onReset,
  lastUpdatedAt,
  lastUpdatedBy,
}: FormProps & { lastUpdatedAt: string | null; lastUpdatedBy: string | null }) {
  const name = view["general.companyName"].trim();
  const email = view["general.supportEmail"].trim();
  const phone = view["general.supportPhone"].trim();
  const errors = {
    name: name ? undefined : "Company name is required.",
    email:
      email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "Enter a valid email address."
        : undefined,
    phone: phone && !/^[+\d\s()-]+$/.test(phone) ? "Use digits, spaces, + ( ) - only." : undefined,
  };
  const invalid = Boolean(errors.name || errors.email || errors.phone);

  return (
    <SettingsSection
      title="General"
      description="Company identity and regional defaults."
      footer={
        <>
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p>
              Last updated:{" "}
              <span className="font-medium text-foreground">{formatDateTime(lastUpdatedAt)}</span>
            </p>
            <p>
              Updated by:{" "}
              <span className="font-medium text-foreground">{lastUpdatedBy ?? "—"}</span>
            </p>
            {unsavedNote(dirty)}
          </div>
          <FormActions
            dirty={dirty}
            saving={saving}
            onSave={onSave}
            onReset={onReset}
            disabled={invalid}
          />
        </>
      }
    >
      <SettingsInput
        id="company-name"
        label="Company name"
        value={view["general.companyName"]}
        maxLength={120}
        error={errors.name}
        onChange={(event) => setValue("general.companyName", event.target.value)}
      />
      <SettingsInput
        id="support-email"
        label="Support email"
        type="email"
        value={view["general.supportEmail"]}
        error={errors.email}
        onChange={(event) => setValue("general.supportEmail", event.target.value)}
      />
      <SettingsInput
        id="support-phone"
        label="Support phone"
        type="tel"
        value={view["general.supportPhone"]}
        error={errors.phone}
        onChange={(event) => setValue("general.supportPhone", event.target.value)}
      />
      <SettingsSelect
        id="currency"
        label="Default currency"
        description="Stored for new features; existing screens keep their current INR formatting."
        value={view["general.currency"]}
        options={toOptions(CURRENCY_OPTIONS, CURRENCY_LABELS)}
        onChange={(value) =>
          setValue("general.currency", value as SettingsValues["general.currency"])
        }
      />
      <SettingsSelect
        id="timezone"
        label="Timezone"
        value={view["general.timezone"]}
        options={toOptions(TIMEZONE_OPTIONS)}
        onChange={(value) =>
          setValue("general.timezone", value as SettingsValues["general.timezone"])
        }
      />
      <SettingsSelect
        id="date-format"
        label="Date format"
        value={view["general.dateFormat"]}
        options={toOptions(DATE_FORMAT_OPTIONS)}
        onChange={(value) =>
          setValue("general.dateFormat", value as SettingsValues["general.dateFormat"])
        }
      />
    </SettingsSection>
  );
}

const STORED_ONLY = (
  <ConfigStatusBadge tone="warn">Preference stored · delivery not active</ConfigStatusBadge>
);

function NotificationsSection({
  view,
  pendingKey,
  onToggle,
}: {
  view: SettingsValues;
  pendingKey: SettingKey | null;
  onToggle: (key: SettingKey, checked: boolean) => void;
}) {
  const rows: { key: SettingKey; label: string; description: string; id: string }[] = [
    {
      key: "notifications.emailEnabled",
      id: "n-email",
      label: "Email notifications",
      description: "Master switch for all email notifications from the platform.",
    },
    {
      key: "notifications.renewalReminders",
      id: "n-renewal",
      label: "Policy renewal reminders",
      description: "Remind customers and agents before a sold policy expires.",
    },
    {
      key: "notifications.paymentReminders",
      id: "n-payment",
      label: "Payment reminders",
      description: "Remind about pending or due premium payments.",
    },
    {
      key: "notifications.agentAccountAlerts",
      id: "n-agent",
      label: "Agent account notifications",
      description: "Notify agents when their account or credentials change.",
    },
    {
      key: "notifications.adminActivityAlerts",
      id: "n-admin",
      label: "Admin activity notifications",
      description: "Notify admins about notable activity across the platform.",
    },
  ];
  return (
    <SettingsSection
      title="Notifications"
      description="Each toggle saves immediately. The backend does not send emails yet, so these record your preference for when delivery is added."
    >
      {rows.map((row) => (
        <SettingsToggle
          key={row.key}
          id={row.id}
          label={row.label}
          description={row.description}
          checked={view[row.key] as boolean}
          saving={pendingKey === row.key}
          disabled={pendingKey !== null}
          badge={STORED_ONLY}
          onCheckedChange={(checked) => onToggle(row.key, checked)}
        />
      ))}
    </SettingsSection>
  );
}

function PolicySection({ view, setValue, dirty, saving, onSave, onReset }: FormProps) {
  const days = view["policy.defaultRenewalReminderDays"];
  const daysError =
    Number.isInteger(days) && days >= 1 && days <= 365
      ? undefined
      : "Enter a whole number from 1 to 365.";
  return (
    <SettingsSection
      title="Policy & Sales"
      description="Rules applied to future sales. Existing policy records are never changed by these settings."
      footer={
        <>
          {unsavedNote(dirty)}
          <FormActions
            dirty={dirty}
            saving={saving}
            onSave={onSave}
            onReset={onReset}
            disabled={Boolean(daysError)}
          />
        </>
      }
    >
      <SettingsToggle
        id="allow-agent-sales"
        label="Allow agent policy sales"
        description="When off, the API rejects new sales from agents (403). Super Admins can still record sales."
        checked={view["policy.allowAgentSales"]}
        onCheckedChange={(checked) => setValue("policy.allowAgentSales", checked)}
        badge={<ConfigStatusBadge tone="ok">Enforced by API</ConfigStatusBadge>}
      />
      <SettingsSelect
        id="default-payment-status"
        label="Default payment status for new sales"
        description="Used when a sale request does not state a payment status."
        value={view["policy.defaultPaymentStatus"]}
        options={[
          { value: "PENDING", label: "Pending" },
          { value: "DUE", label: "Due" },
        ]}
        onChange={(value) =>
          setValue(
            "policy.defaultPaymentStatus",
            value as SettingsValues["policy.defaultPaymentStatus"],
          )
        }
      />
      <SettingsToggle
        id="renewal-enabled"
        label="Enable renewal reminders"
        description="Whether sold policies are eligible for renewal reminders."
        checked={view["policy.renewalRemindersEnabled"]}
        onCheckedChange={(checked) => setValue("policy.renewalRemindersEnabled", checked)}
        badge={STORED_ONLY}
      />
      <SettingsInput
        id="renewal-days"
        label="Default renewal reminder days"
        description="Days before expiry a reminder should be sent."
        type="number"
        min={1}
        max={365}
        step={1}
        inputMode="numeric"
        value={Number.isNaN(days) ? "" : days}
        error={daysError}
        onChange={(event) =>
          setValue("policy.defaultRenewalReminderDays", Number.parseInt(event.target.value, 10))
        }
      />
    </SettingsSection>
  );
}

function yesNo(value: boolean, tone: StatusTone = "ok") {
  return (
    <ConfigStatusBadge tone={value ? tone : "neutral"}>{value ? "Yes" : "No"}</ConfigStatusBadge>
  );
}

function SecuritySection() {
  const health = useHealth();
  const security = health.data?.config?.security;
  const unavailable = <ConfigStatusBadge tone="neutral">Unavailable</ConfigStatusBadge>;

  const passwordPolicy = security
    ? [
        `${security.agentPasswordPolicy.minLength}–${security.agentPasswordPolicy.maxLength} characters`,
        security.agentPasswordPolicy.requiresLetter && "at least one letter",
        security.agentPasswordPolicy.requiresNumber && "at least one number",
        security.agentPasswordPolicy.noLeadingTrailingSpaces && "no leading/trailing spaces",
      ]
        .filter(Boolean)
        .join(", ")
    : null;
  const superAdminMethods = security
    ? [
        security.superAdminAuth.firebase && "Google / Firebase",
        security.superAdminAuth.password && "Admin ID + password",
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <SettingsSection
      title="Security"
      description="Read-only. Reflects the backend's actual configuration; secrets are never shown."
    >
      <SettingsRow
        label="Super Admin authentication"
        description="Methods the backend currently accepts."
      >
        {superAdminMethods ? (
          <p className="text-sm font-medium">{superAdminMethods}</p>
        ) : (
          unavailable
        )}
      </SettingsRow>
      <SettingsRow label="Agent authentication" description="How agents sign in.">
        <p className="text-sm font-medium">Agent code / email + password</p>
      </SettingsRow>
      <SettingsRow
        label="Agent password policy"
        description="Enforced when an agent chooses a password."
      >
        {passwordPolicy ? <p className="text-sm font-medium">{passwordPolicy}</p> : unavailable}
      </SettingsRow>
      <SettingsRow
        label="Agent session lifetime"
        description="Absolute lifetime of a password sign-in session."
      >
        {security ? (
          <p className="text-sm font-medium">{security.sessionLifetimeHours} hours</p>
        ) : (
          unavailable
        )}
      </SettingsRow>
      <SettingsRow
        label="Cookie security"
        description="Session cookie attributes in this environment."
      >
        {security ? (
          <div className="flex flex-wrap gap-1.5">
            <ConfigStatusBadge tone="ok">HttpOnly</ConfigStatusBadge>
            <ConfigStatusBadge tone={security.cookie.secure ? "ok" : "warn"}>
              {security.cookie.secure ? "Secure" : "Not Secure (non-HTTPS)"}
            </ConfigStatusBadge>
            <ConfigStatusBadge tone="neutral">
              SameSite={security.cookie.sameSite}
            </ConfigStatusBadge>
          </div>
        ) : (
          unavailable
        )}
      </SettingsRow>
      <SettingsRow
        label="Role-based access control"
        description="Roles are loaded from the database on every request."
      >
        {security ? yesNo(security.roleBasedAccessControl) : unavailable}
      </SettingsRow>
      <SettingsRow
        label="Audit logging"
        description="Sensitive actions are recorded with the acting user."
      >
        {security ? yesNo(security.auditLogging) : unavailable}
      </SettingsRow>
      <SettingsRow
        label="Cookie domain, SameSite, proxy trust, CORS origins"
        description="Environment-managed; change them in the deployment and restart."
      >
        <ConfigStatusBadge tone="neutral">{DEPLOYMENT_MANAGED}</ConfigStatusBadge>
      </SettingsRow>
    </SettingsSection>
  );
}

function useHealth() {
  return useQuery({
    queryKey: healthKey,
    queryFn: settingsApi.health,
    enabled: isApiConfigured && typeof window !== "undefined",
    retry: retryUnlessClientError,
    refetchOnWindowFocus: false,
  });
}

function SystemSection() {
  const health = useHealth();
  const status = health.data;
  const api = status?.api;

  const apiTone: StatusTone = !status
    ? "neutral"
    : api?.status === "ok"
      ? "ok"
      : api
        ? "warn"
        : "bad";
  const apiLabel = !status
    ? "Checking…"
    : api?.status === "ok"
      ? "Operational"
      : api
        ? "Degraded"
        : "Unavailable";
  const dbLabel = !status ? "Checking…" : api?.database === "up" ? "Connected" : "Unavailable";
  const cfg = status?.config?.configuration;
  const flag = (value: "configured" | "not_configured" | undefined) =>
    value === undefined
      ? { label: "Unknown", tone: "neutral" as const }
      : value === "configured"
        ? { label: "Configured", tone: "ok" as const }
        : { label: "Not Configured", tone: "warn" as const };

  return (
    <SettingsSection
      title="System & Integrations"
      description="Live status from the backend. No connection strings or credentials are exposed."
      footer={
        <>
          <span className="text-xs text-muted-foreground">
            Last checked: {formatDateTime(status?.checkedAt)}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void health.refetch()}
            disabled={health.isFetching}
          >
            <RefreshCw className={cn("size-3.5", health.isFetching && "animate-spin")} />
            Refresh Status
          </Button>
        </>
      }
    >
      {health.isError ? (
        <p role="alert" className="px-6 py-5 text-sm text-destructive">
          Could not check system status. {errorMessage(health.error)}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
          <SystemStatusCard label="API" value={apiLabel} tone={apiTone} />
          <SystemStatusCard
            label="PostgreSQL"
            value={dbLabel}
            tone={!status ? "neutral" : api?.database === "up" ? "ok" : "bad"}
          />
          <SystemStatusCard
            label="Uptime"
            value={api ? formatDuration(api.uptimeSeconds) : "—"}
            tone="neutral"
          />
          <SystemStatusCard
            label="Backend API"
            value={!status ? "Checking…" : status.unreachable ? "Not Connected" : "Connected"}
            tone={!status ? "neutral" : status.unreachable ? "bad" : "ok"}
          />
          <SystemStatusCard
            label="Firebase"
            value={flag(cfg?.firebase).label}
            tone={flag(cfg?.firebase).tone}
            detail={
              cfg?.firebaseAdminCredentials === "configured"
                ? "Admin credentials present"
                : cfg
                  ? "Admin credentials not set (uses default credentials)"
                  : undefined
            }
          />
          <SystemStatusCard
            label="Database"
            value={flag(cfg?.database).label}
            tone={flag(cfg?.database).tone}
          />
        </div>
      )}
    </SettingsSection>
  );
}

function AccountSection() {
  const { signOut, isSigningOut } = useAdminSignOut();
  const health = useHealth();
  const me = useQuery({
    queryKey: meKey,
    queryFn: authApi.me,
    enabled: isApiConfigured && typeof window !== "undefined",
    retry: retryUnlessClientError,
    refetchOnWindowFocus: false,
  });
  const user = me.data;
  const method = health.data?.config?.session.method;

  return (
    <SettingsSection
      title="Account"
      description="The Super Admin account you are signed in with."
      footer={
        <>
          <span className="text-xs text-muted-foreground">
            The account email is managed by deployment configuration and cannot be changed here.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void signOut()}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <LogOut className="size-3.5" />
            )}
            Sign Out
          </Button>
        </>
      }
    >
      {me.isError ? (
        <p role="alert" className="px-6 py-5 text-sm text-destructive">
          Could not load account details. {errorMessage(me.error)}
        </p>
      ) : (
        <>
          <SettingsRow label="Email">
            <p className="break-all text-sm font-medium">{user?.email ?? "—"}</p>
          </SettingsRow>
          <SettingsRow label="Role">
            <p className="text-sm font-medium">{user ? "Super Admin" : "—"}</p>
          </SettingsRow>
          <SettingsRow label="Account status">
            {user ? (
              <ConfigStatusBadge tone={user.status === "ACTIVE" ? "ok" : "bad"}>
                {user.status === "ACTIVE" ? "Active" : "Disabled"}
              </ConfigStatusBadge>
            ) : (
              <p className="text-sm">—</p>
            )}
          </SettingsRow>
          <SettingsRow label="Last login">
            <p className="text-sm font-medium">{formatDateTime(user?.lastLoginAt)}</p>
          </SettingsRow>
          <SettingsRow label="Current sign-in method">
            <p className="text-sm font-medium">
              {method === "FIREBASE"
                ? "Google / Firebase"
                : method === "PASSWORD_SESSION"
                  ? "Admin ID + password session"
                  : "—"}
            </p>
          </SettingsRow>
        </>
      )}
    </SettingsSection>
  );
}

function DataSection({ onClearLocal }: { onClearLocal: () => void }) {
  const { signOut, isSigningOut } = useAdminSignOut();
  return (
    <>
      <SettingsSection title="Data & Audit" description="Audit trail and data access.">
        <SettingsRow
          label="Audit logging"
          description="Settings changes, sign-ins and record changes are written to the audit log. The log viewer UI is not built yet; entries are available to Super Admins at GET /api/v1/audit-logs."
          badge={<ConfigStatusBadge tone="ok">Active</ConfigStatusBadge>}
        />
        <SettingsRow
          label="Audit retention"
          description="No automatic deletion is implemented: entries are kept until removed at the database level."
        >
          <ConfigStatusBadge tone="neutral">{DEPLOYMENT_MANAGED}</ConfigStatusBadge>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Danger Zone"
        description="Only browser-local and session actions. No database actions are offered here."
      >
        <SettingsRow
          label="Clear local preferences"
          description="Discards unsaved edits and cached admin data in this browser. Saved settings are not affected."
        >
          <Button type="button" size="sm" variant="outline" onClick={onClearLocal}>
            Clear local preferences
          </Button>
        </SettingsRow>
        <SettingsRow label="Sign out" description="End your Super Admin session on this device.">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => void signOut()}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <LogOut className="size-3.5" />
            )}
            Sign Out
          </Button>
        </SettingsRow>
      </SettingsSection>
    </>
  );
}
