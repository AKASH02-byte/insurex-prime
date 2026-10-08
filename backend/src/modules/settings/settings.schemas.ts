import { z } from "zod";

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"] as const;
export const TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;
export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export const DEFAULT_PAYMENT_STATUSES = ["PENDING", "DUE"] as const;

interface Definition<T extends z.ZodType = z.ZodType> {
  category: "general" | "notifications" | "policy";
  description: string;
  schema: T;
  default: z.infer<T>;
  /** Old/new values may be written to the audit log (never true for free-text/PII). */
  auditValues: boolean;
}

const define = <T extends z.ZodType>(definition: Definition<T>) => definition;

const text = (max: number) => z.string().trim().min(1).max(max);

/**
 * The only settings that can be stored. Each key has its own schema and default, so the
 * API rejects unknown keys and wrongly-typed values, and a fresh database needs no rows.
 */
export const SETTING_DEFINITIONS = {
  "general.companyName": define({
    category: "general",
    description: "Legal or display name of the company.",
    schema: text(120),
    default: "InsuroX Prime",
    auditValues: false,
  }),
  "general.supportEmail": define({
    category: "general",
    description: "Support contact email address.",
    schema: z.union([z.literal(""), z.email().max(254)]),
    default: "",
    auditValues: false,
  }),
  "general.supportPhone": define({
    category: "general",
    description: "Support contact phone number.",
    schema: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d\s()-]*$/, "may only contain digits, spaces, + ( ) -"),
    default: "",
    auditValues: false,
  }),
  "general.currency": define({
    category: "general",
    description: "Default currency.",
    schema: z.enum(CURRENCIES),
    default: "INR" as (typeof CURRENCIES)[number],
    auditValues: true,
  }),
  "general.timezone": define({
    category: "general",
    description: "Default timezone.",
    schema: z.enum(TIMEZONES),
    default: "Asia/Kolkata" as (typeof TIMEZONES)[number],
    auditValues: true,
  }),
  "general.dateFormat": define({
    category: "general",
    description: "Default date format.",
    schema: z.enum(DATE_FORMATS),
    default: "DD/MM/YYYY" as (typeof DATE_FORMATS)[number],
    auditValues: true,
  }),
  "notifications.emailEnabled": define({
    category: "notifications",
    description: "Master switch for email notifications.",
    schema: z.boolean(),
    default: true,
    auditValues: true,
  }),
  "notifications.renewalReminders": define({
    category: "notifications",
    description: "Send policy renewal reminders.",
    schema: z.boolean(),
    default: true,
    auditValues: true,
  }),
  "notifications.paymentReminders": define({
    category: "notifications",
    description: "Send payment reminders.",
    schema: z.boolean(),
    default: true,
    auditValues: true,
  }),
  "notifications.agentAccountAlerts": define({
    category: "notifications",
    description: "Notify agents about account changes.",
    schema: z.boolean(),
    default: true,
    auditValues: true,
  }),
  "notifications.adminActivityAlerts": define({
    category: "notifications",
    description: "Notify admins about notable activity.",
    schema: z.boolean(),
    default: false,
    auditValues: true,
  }),
  "policy.allowAgentSales": define({
    category: "policy",
    description: "Allow agents to record new policy sales. Enforced by the API.",
    schema: z.boolean(),
    default: true,
    auditValues: true,
  }),
  "policy.defaultPaymentStatus": define({
    category: "policy",
    description:
      "Payment status of a new sale when the request does not specify one. Enforced by the API.",
    schema: z.enum(DEFAULT_PAYMENT_STATUSES),
    default: "PENDING" as (typeof DEFAULT_PAYMENT_STATUSES)[number],
    auditValues: true,
  }),
  "policy.renewalRemindersEnabled": define({
    category: "policy",
    description: "Enable renewal reminders for sold policies.",
    schema: z.boolean(),
    default: true,
    auditValues: true,
  }),
  "policy.defaultRenewalReminderDays": define({
    category: "policy",
    description: "Days before expiry to send a renewal reminder.",
    schema: z.number().int().min(1).max(365),
    default: 30,
    auditValues: true,
  }),
} as const;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;
export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[];

type ValueOf<K extends SettingKey> = z.infer<(typeof SETTING_DEFINITIONS)[K]["schema"]>;
export type SettingValues = { [K in SettingKey]: ValueOf<K> };

const updateShape = Object.fromEntries(
  SETTING_KEYS.map((key) => [key, SETTING_DEFINITIONS[key].schema.optional()]),
) as { [K in SettingKey]: z.ZodOptional<(typeof SETTING_DEFINITIONS)[K]["schema"]> };

/** Strict: any key outside the registry is a 400, not silently stored. */
export const updateSettingsBodySchema = z.strictObject({
  settings: z
    .strictObject(updateShape)
    .refine((values) => Object.values(values).some((value) => value !== undefined), {
      message: "Provide at least one setting to change.",
    }),
});

// ─── Responses ────────────────────────────────────────────────────────────────
export const settingItemSchema = z.object({
  key: z.string(),
  category: z.string(),
  description: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]),
  isDefault: z.boolean(),
  updatedAt: z.iso.datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export const settingsResponseSchema = z
  .object({
    items: z.array(settingItemSchema),
    lastUpdatedAt: z.iso.datetime().nullable(),
    lastUpdatedBy: z.string().nullable(),
  })
  .meta({ id: "SystemSettings" });

const statusFlag = z.enum(["configured", "not_configured"]);

export const settingsHealthSchema = z
  .object({
    checkedAt: z.iso.datetime(),
    environment: z.enum(["development", "test", "production"]),
    database: z.enum(["up", "down"]),
    uptimeSeconds: z.number(),
    configuration: z.object({
      firebase: statusFlag,
      firebaseAdminCredentials: statusFlag,
      database: statusFlag,
      adminPasswordLogin: statusFlag,
    }),
    security: z.object({
      superAdminAuth: z.object({ firebase: z.boolean(), password: z.boolean() }),
      agentAuth: z.literal("AGENT_CODE_OR_EMAIL_PASSWORD"),
      agentPasswordPolicy: z.object({
        minLength: z.number(),
        maxLength: z.number(),
        requiresLetter: z.boolean(),
        requiresNumber: z.boolean(),
        noLeadingTrailingSpaces: z.boolean(),
      }),
      sessionLifetimeHours: z.number(),
      cookie: z.object({
        httpOnly: z.literal(true),
        secure: z.boolean(),
        sameSite: z.enum(["lax", "strict", "none"]),
      }),
      roleBasedAccessControl: z.boolean(),
      auditLogging: z.boolean(),
      auditRetention: z.literal("NO_AUTOMATIC_DELETION"),
    }),
    session: z.object({ method: z.enum(["FIREBASE", "PASSWORD_SESSION"]) }),
  })
  .meta({ id: "SettingsHealth" });
