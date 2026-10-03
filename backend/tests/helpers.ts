import { buildApp, type App } from "../src/app.js";
import { createDatabase, type Database } from "../src/config/database.js";
import { loadEnv } from "../src/config/env.js";
import { TokenVerificationError, type TokenVerifier } from "../src/config/firebase.js";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasTestDatabase = Boolean(TEST_DATABASE_URL);
export const SUPER_ADMIN_EMAIL = "root.admin@test.example.com";
export const TENANT_ADMIN_EMAIL = "tenant.admin@test.example.com";

/**
 * Fake Firebase verifier. Tokens look like "valid|<uid>|<email>[|unverified]".
 * "expired" and anything else simulate rejected tokens.
 */
export const fakeVerifier: TokenVerifier = {
  async verifyIdToken(token) {
    if (token === "expired") throw new TokenVerificationError("expired");
    const [kind, uid, email, flag] = token.split("|");
    if (kind !== "valid" || !uid || !email) throw new TokenVerificationError("invalid");
    return { uid, email: email.toLowerCase(), emailVerified: flag !== "unverified" };
  },
};

export const tokenFor = (uid: string, email: string) => `valid|${uid}|${email}`;
export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

export async function createTestApp(): Promise<{ app: App; db: Database }> {
  const env = loadEnv({
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL!,
    FIREBASE_PROJECT_ID: "insurex-test",
    FRONTEND_URL: "http://localhost:8080",
    SUPER_ADMIN_EMAILS: SUPER_ADMIN_EMAIL,
    DOCS_ENABLED: "true",
  });
  // A local PGlite server mixes up concurrent connections, so it can be limited to one.
  const poolMax = Number(process.env.TEST_DATABASE_POOL_MAX) || undefined;
  const db = createDatabase(env.DATABASE_URL, poolMax);
  const app = await buildApp({ env, db, tokenVerifier: fakeVerifier, logger: false });
  await app.ready();
  return { app, db };
}

/** Creates an insurer, a tenant and its pre-provisioned admin (signs in via the fake Firebase token). */
export async function seedTenant(
  db: Database,
  input: { insurerCode?: string; name?: string; businessCode?: string; adminEmail?: string } = {},
) {
  const insurerCode = input.insurerCode ?? "TATA_AIA";
  const insurer = await db.insurer.upsert({
    where: { code: insurerCode },
    update: {},
    create: { code: insurerCode, name: insurerCode.replace("_", " ") },
  });
  const tenant = await db.tenant.create({
    data: {
      name: input.name ?? "Test Agency",
      legalName: `${input.name ?? "Test Agency"} Pvt Ltd`,
      insurers: {
        create: {
          insurerId: insurer.id,
          businessCode: input.businessCode ?? "BC-1",
          licenceCode: "LIC-1",
        },
      },
    },
  });
  await db.user.create({
    data: {
      email: input.adminEmail ?? TENANT_ADMIN_EMAIL,
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
    },
  });
  return { insurer, tenant };
}

export async function resetDatabase(db: Database) {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "receipts", "sold_policies", "customers", "agents", "policies", "policy_categories", "audit_logs", "system_settings", "users", "tenant_insurers", "tenants", "insurers" CASCADE',
  );
}
