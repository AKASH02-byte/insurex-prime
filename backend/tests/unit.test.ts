import { describe, expect, it } from "vitest";
import { EnvValidationError, loadEnv, normalizePrivateKey } from "../src/config/env.js";
import { computeExpiryDate } from "../src/modules/sold-policies/sold-policies.service.js";
import { toDateFilter } from "../src/utils/pagination.js";

const baseEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  FIREBASE_PROJECT_ID: "demo-project",
  FRONTEND_URL: "http://localhost:8080, https://insurex-prime.vercel.app",
};

describe("env", () => {
  it("parses origins and defaults", () => {
    const env = loadEnv(baseEnv);
    expect(env.FRONTEND_URL).toEqual(["http://localhost:8080", "https://insurex-prime.vercel.app"]);
    expect(env.PORT).toBe(4000);
    expect(env.FIREBASE_CLIENT_EMAIL).toBeUndefined();
  });

  it("rejects a wildcard origin in production", () => {
    expect(() => loadEnv({ ...baseEnv, NODE_ENV: "production", FRONTEND_URL: "*" })).toThrow(
      EnvValidationError,
    );
  });

  it("rejects origins with paths", () => {
    expect(() => loadEnv({ ...baseEnv, FRONTEND_URL: "https://example.com/app" })).toThrow(
      /FRONTEND_URL/,
    );
  });

  it("requires service-account fields together", () => {
    expect(() => loadEnv({ ...baseEnv, FIREBASE_CLIENT_EMAIL: "svc@example.com" })).toThrow(
      /FIREBASE_PRIVATE_KEY/,
    );
  });

  it("never includes secret values in error messages", () => {
    try {
      loadEnv({ ...baseEnv, DATABASE_URL: "mysql://secret-password@db" });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain("secret-password");
    }
  });

  it("normalizes escaped and quoted private keys", () => {
    expect(normalizePrivateKey('"-----BEGIN KEY-----\\nabc\\n-----END KEY-----\\n"')).toBe(
      "-----BEGIN KEY-----\nabc\n-----END KEY-----\n",
    );
  });
});

describe("date helpers", () => {
  it("treats a date-only `to` as inclusive", () => {
    const filter = toDateFilter({ from: "2026-01-01", to: "2026-01-31" });
    expect(filter?.gte?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(filter?.lt?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("rejects inverted ranges", () => {
    expect(() => toDateFilter({ from: "2026-02-01", to: "2026-01-01" })).toThrow();
  });

  it("computes the last day of cover", () => {
    const expiry = computeExpiryDate(new Date("2026-01-01T00:00:00Z"), 12);
    expect(expiry.toISOString().slice(0, 10)).toBe("2026-12-31");
  });
});
