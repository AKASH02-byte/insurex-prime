import { ApiError, apiRequest } from "./client";

export type SettingValue = string | number | boolean;

export const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "AED"] as const;
export const TIMEZONE_OPTIONS = [
  "Asia/Kolkata",
  "UTC",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;
export const DATE_FORMAT_OPTIONS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;

/** Every persisted setting, keyed exactly as in the backend registry. */
export interface SettingsValues {
  "general.companyName": string;
  "general.supportEmail": string;
  "general.supportPhone": string;
  "general.currency": (typeof CURRENCY_OPTIONS)[number];
  "general.timezone": (typeof TIMEZONE_OPTIONS)[number];
  "general.dateFormat": (typeof DATE_FORMAT_OPTIONS)[number];
  "notifications.emailEnabled": boolean;
  "notifications.renewalReminders": boolean;
  "notifications.paymentReminders": boolean;
  "notifications.agentAccountAlerts": boolean;
  "notifications.adminActivityAlerts": boolean;
  "policy.allowAgentSales": boolean;
  "policy.defaultPolicyStatus": "PENDING" | "ACTIVE";
  "policy.defaultPaymentStatus": "PENDING" | "DUE";
  "policy.renewalRemindersEnabled": boolean;
  "policy.defaultRenewalReminderDays": number;
}
export type SettingKey = keyof SettingsValues;

export interface SettingItem {
  key: SettingKey;
  category: string;
  description: string;
  value: SettingValue;
  defaultValue: SettingValue;
  isDefault: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SystemSettings {
  items: SettingItem[];
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
}

export interface PublicHealth {
  status: "ok" | "degraded";
  database: "up" | "down";
  uptimeSeconds: number;
  timestamp: string;
}

type ConfigFlag = "configured" | "not_configured";

export interface SettingsHealth {
  checkedAt: string;
  environment: "development" | "test" | "production";
  database: "up" | "down";
  uptimeSeconds: number;
  configuration: {
    firebase: ConfigFlag;
    firebaseAdminCredentials: ConfigFlag;
    database: ConfigFlag;
    adminPasswordLogin: ConfigFlag;
  };
  security: {
    superAdminAuth: { firebase: boolean; password: boolean };
    agentAuth: "AGENT_CODE_OR_EMAIL_PASSWORD";
    agentPasswordPolicy: {
      minLength: number;
      maxLength: number;
      requiresLetter: boolean;
      requiresNumber: boolean;
      noLeadingTrailingSpaces: boolean;
    };
    sessionLifetimeHours: number;
    cookie: { httpOnly: true; secure: boolean; sameSite: "lax" | "strict" | "none" };
    roleBasedAccessControl: boolean;
    auditLogging: boolean;
    auditRetention: "NO_AUTOMATIC_DELETION";
  };
  session: { method: "FIREBASE" | "PASSWORD_SESSION" };
}

export interface SystemStatus {
  /** The public /health endpoint answered (200 healthy, 503 degraded). */
  api: PublicHealth | null;
  /** Network failure reaching the backend at all. */
  unreachable: boolean;
  /** Super Admin-only configuration facts; null if that call failed. */
  config: SettingsHealth | null;
  checkedAt: string;
}

export const settingsApi = {
  get: () => apiRequest<SystemSettings>("/settings"),
  update: (settings: Partial<SettingsValues>) =>
    apiRequest<SystemSettings>("/settings", { method: "PATCH", body: { settings } }),
  /** Reuses the public /health probe (503 = degraded) plus /settings/health for configuration. */
  async health(): Promise<SystemStatus> {
    const [api, config] = await Promise.allSettled([
      apiRequest<PublicHealth>("/health", { acceptStatuses: [503] }),
      apiRequest<SettingsHealth>("/settings/health"),
    ]);
    const networkDown = (result: PromiseSettledResult<unknown>) =>
      result.status === "rejected" &&
      result.reason instanceof ApiError &&
      result.reason.code === "NETWORK_ERROR";
    if (api.status === "rejected" && !networkDown(api)) throw api.reason;
    return {
      api: api.status === "fulfilled" ? api.value : null,
      unreachable: networkDown(api),
      config: config.status === "fulfilled" ? config.value : null,
      checkedAt: new Date().toISOString(),
    };
  },
};
