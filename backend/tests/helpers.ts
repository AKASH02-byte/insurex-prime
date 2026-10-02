import { buildApp, type App } from "../src/app.js";
import { createDatabase, type Database } from "../src/config/database.js";
import { loadEnv } from "../src/config/env.js";
import { TokenVerificationError, type TokenVerifier } from "../src/config/firebase.js";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasTestDatabase = Boolean(TEST_DATABASE_URL);
export const SUPER_ADMIN_EMAIL = "root.admin@test.example.com";

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
  const db = createDatabase(env.DATABASE_URL);
  const app = await buildApp({ env, db, tokenVerifier: fakeVerifier, logger: false });
  await app.ready();
  return { app, db };
}

export async function resetDatabase(db: Database) {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "receipts", "sold_policies", "customers", "agents", "policies", "audit_logs", "users" CASCADE',
  );
}
