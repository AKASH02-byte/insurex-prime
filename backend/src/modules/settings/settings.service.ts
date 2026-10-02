import type { FastifyRequest } from "fastify";
import type { Database } from "../../config/database.js";
import type { Env } from "../../config/env.js";
import { isDatabaseReachable } from "../../config/database.js";
import type { AuthContext } from "../../middleware/auth.js";
import { recordAudit } from "../audit-logs/audit-logs.service.js";
import {
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  type SettingKey,
  type SettingValues,
} from "./settings.schemas.js";

type Primitive = string | number | boolean;

/** Stored rows that still parse under the current schema override the defaults. */
export async function getEffectiveSettings(db: Database) {
  const rows = await db.systemSetting.findMany({
    include: { updatedBy: { select: { email: true } } },
  });
  const stored = new Map(rows.map((row) => [row.key, row]));
  const values: Record<string, Primitive> = {};
  const items = SETTING_KEYS.map((key) => {
    const definition = SETTING_DEFINITIONS[key];
    const row = stored.get(key);
    // A row that no longer validates (e.g. an enum was narrowed) falls back to the default.
    const parsed = row ? definition.schema.safeParse(row.value) : undefined;
    const value = (parsed?.success ? parsed.data : definition.default) as Primitive;
    values[key] = value;
    return {
      key,
      category: definition.category,
      description: definition.description,
      value,
      defaultValue: definition.default as Primitive,
      isDefault: !parsed?.success,
      updatedAt: parsed?.success && row ? row.updatedAt.toISOString() : null,
      updatedBy: parsed?.success && row ? (row.updatedBy?.email ?? null) : null,
    };
  });
  const latest = items
    .filter((item) => item.updatedAt)
    .sort((a, b) => b.updatedAt!.localeCompare(a.updatedAt!))[0];
  return {
    values: values as unknown as SettingValues,
    response: {
      items,
      lastUpdatedAt: latest?.updatedAt ?? null,
      lastUpdatedBy: latest?.updatedBy ?? null,
    },
  };
}

export async function getSettingValues(db: Database): Promise<SettingValues> {
  return (await getEffectiveSettings(db)).values;
}

export async function updateSettings(
  db: Database,
  auth: AuthContext,
  request: FastifyRequest,
  input: Partial<Record<SettingKey, Primitive>>,
) {
  const current = (await getEffectiveSettings(db)).values as unknown as Record<string, Primitive>;
  const changes = SETTING_KEYS.filter(
    (key) => input[key] !== undefined && input[key] !== current[key],
  );

  if (changes.length > 0) {
    await db.$transaction(async (tx) => {
      for (const key of changes) {
        const definition = SETTING_DEFINITIONS[key];
        const value = input[key] as Primitive;
        await tx.systemSetting.upsert({
          where: { key },
          create: {
            key,
            category: definition.category,
            description: definition.description,
            value,
            updatedByUserId: auth.userId,
          },
          update: { value, updatedByUserId: auth.userId },
        });
      }
      await recordAudit(tx, request, {
        action: "settings.update",
        entity: "SystemSetting",
        metadata: {
          changedKeys: changes,
          // Only non-sensitive values (flags, enums, numbers); free text is never logged.
          changes: Object.fromEntries(
            changes
              .filter((key) => SETTING_DEFINITIONS[key].auditValues)
              .map((key) => [
                key,
                { from: current[key] as Primitive, to: input[key] as Primitive },
              ]),
          ),
        },
      });
    });
  }
  return (await getEffectiveSettings(db)).response;
}

/** Read-only view of configuration facts. Never includes values of secrets. */
export async function getSettingsHealth(db: Database, config: Env, auth: AuthContext) {
  const databaseUp = await isDatabaseReachable(db);
  const adminPasswordLogin = Boolean(
    config.ADMIN_PASSWORD && config.ADMIN_LOGIN_IDS.some((id) => id.includes("@")),
  );
  const flag = (on: boolean) => (on ? ("configured" as const) : ("not_configured" as const));
  return {
    checkedAt: new Date().toISOString(),
    environment: config.NODE_ENV,
    database: databaseUp ? ("up" as const) : ("down" as const),
    uptimeSeconds: Math.round(process.uptime()),
    configuration: {
      firebase: flag(Boolean(config.FIREBASE_PROJECT_ID)),
      firebaseAdminCredentials: flag(
        Boolean(config.FIREBASE_CLIENT_EMAIL && config.FIREBASE_PRIVATE_KEY),
      ),
      database: flag(Boolean(config.DATABASE_URL)),
      adminPasswordLogin: flag(adminPasswordLogin),
    },
    security: {
      superAdminAuth: { firebase: true, password: adminPasswordLogin },
      agentAuth: "AGENT_CODE_OR_EMAIL_PASSWORD" as const,
      // Mirrors `newPasswordSchema` in modules/auth/password.ts.
      agentPasswordPolicy: {
        minLength: 8,
        maxLength: 128,
        requiresLetter: true,
        requiresNumber: true,
        noLeadingTrailingSpaces: true,
      },
      sessionLifetimeHours: config.AGENT_SESSION_TTL_HOURS,
      cookie: {
        httpOnly: true as const,
        secure: config.AGENT_COOKIE_SECURE,
        sameSite: config.AGENT_COOKIE_SAMESITE,
      },
      roleBasedAccessControl: true,
      auditLogging: true,
      auditRetention: "NO_AUTOMATIC_DELETION" as const,
    },
    session: { method: auth.sessionId ? ("PASSWORD_SESSION" as const) : ("FIREBASE" as const) },
  };
}
