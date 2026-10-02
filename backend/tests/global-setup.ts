import { execSync } from "node:child_process";

/**
 * Applies migrations to TEST_DATABASE_URL before integration tests.
 * Integration tests are skipped when TEST_DATABASE_URL is not set.
 */
export default function setup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    console.warn("TEST_DATABASE_URL not set — database integration tests will be skipped.");
    return;
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === testUrl) {
    throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL: tests truncate all tables.");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}
