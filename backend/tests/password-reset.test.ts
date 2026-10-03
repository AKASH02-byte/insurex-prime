import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "../src/app.js";
import type { Database } from "../src/config/database.js";
import { renderPasswordResetEmail } from "../src/utils/email/password-reset-template.js";
import {
  bearer,
  createTestApp,
  hasTestDatabase,
  resetDatabase,
  seedTenant,
  TENANT_ADMIN_EMAIL,
  tokenFor,
} from "./helpers.js";

const ADMIN = bearer(tokenFor("uid-tenant-admin", TENANT_ADMIN_EMAIL));
const FRONTEND = { origin: "http://localhost:8080" };
const AGENT_EMAIL = "reset.agent@test.example.com";

describe("password reset email template", () => {
  const input = {
    name: "Jyoti",
    agencyName: "Aakruthi Enterprises",
    temporaryPassword: "Hq7v-Kt3m-Pz9a",
    resetUrl: "https://app.example.com/reset-password?token=abc.123.def",
    webBaseUrl: "https://app.example.com/",
    expiresInMinutes: 30,
    year: 2026,
  };

  it("shows the temporary password, the reset link and the expiry", () => {
    const email = renderPasswordResetEmail(input);
    for (const part of [input.temporaryPassword, input.resetUrl, "30 minutes"]) {
      expect(email.html).toContain(part);
      expect(email.text).toContain(part);
    }
    expect(email.html).toContain("https://app.example.com/insurox-icon.png");
    expect(email.html).toContain("Aakruthi Enterprises");
  });

  it("escapes user-controlled values", () => {
    const email = renderPasswordResetEmail({ ...input, name: '<img src=x onerror="a">' });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x");
  });
});

describe.skipIf(!hasTestDatabase)("Forgot password (PostgreSQL integration)", () => {
  let app: App;
  let db: Database;
  let sent: Array<{ to: string[]; subject: string; text: string }>;
  let tempPassword: string;

  const call = async (url: string, payload: unknown, headers: Record<string, string> = FRONTEND) => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1${url}`,
      headers,
      payload: payload as object,
    });
    return { status: response.statusCode, body: response.json() };
  };
  const login = (password: string) =>
    call("/auth/agent/login", { identifier: AGENT_EMAIL, password });
  const request = (identifier = AGENT_EMAIL) => call("/auth/password-reset/request", { identifier });
  const emailed = () => {
    const message = sent.at(-1)!;
    return {
      token: decodeURIComponent(/token=([^&\s]+)/.exec(message.text)![1]!),
      password: /Temporary password: (\S+)/.exec(message.text)![1]!,
    };
  };

  beforeAll(async () => {
    ({ app, db } = await createTestApp({
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "no-reply@test.example.com",
      PASSWORD_RESET_SECRET: "x".repeat(40),
    }));
  });
  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    sent = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      sent.push(JSON.parse(String((init as RequestInit).body)));
      return new Response("{}", { status: 200 });
    });
    await resetDatabase(db);
    await seedTenant(db);
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/agents",
      headers: ADMIN,
      payload: { fullName: "Reset Agent", email: AGENT_EMAIL, phone: "+91 90000 00077" },
    });
    expect(created.statusCode).toBe(201);
    tempPassword = created.json().data.temporaryPassword;
  });
  afterEach(() => vi.restoreAllMocks());

  it("emails a link and temporary password without changing anything until confirmed", async () => {
    expect((await request()).status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toEqual([AGENT_EMAIL]);
    // Agents land in the agent portal's sign-in, admins in the admin one.
    expect(sent[0]!.text).toContain("&role=agent");
    // The current password keeps working until the link is confirmed.
    expect((await login(tempPassword)).status).toBe(200);
  });

  it("confirming applies the temporary password, forces a change and works once", async () => {
    await request();
    const { token, password } = emailed();
    expect((await call("/auth/password-reset/confirm", { token })).status).toBe(200);

    expect((await login(tempPassword)).status).toBe(401);
    const signedIn = await login(password);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.data.user.mustChangePassword).toBe(true);

    const again = await call("/auth/password-reset/confirm", { token });
    expect(again.status).toBe(400);
  });

  it("rejects tampered and expired links", async () => {
    await request();
    const { token } = emailed();
    const [userId, expires] = token.split(".");
    expect((await call("/auth/password-reset/confirm", { token: `${token}x` })).status).toBe(400);
    expect(
      (await call("/auth/password-reset/confirm", { token: `${userId}.${Number(expires) + 60}.${token.split(".")[2]}` }))
        .status,
    ).toBe(400);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 31 * 60_000);
    const expired = await call("/auth/password-reset/confirm", { token });
    vi.useRealTimers();
    expect(expired.status).toBe(400);
  });

  it("answers the same for unknown accounts and sends nothing", async () => {
    const response = await request("nobody@test.example.com");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ requested: true });
    expect(sent).toHaveLength(0);
  });

  it("limits requests per client and identifier", async () => {
    // A phone number is a different limiter key than the email earlier tests used up.
    const phone = "+91 90000 00077";
    for (let index = 0; index < 3; index += 1) expect((await request(phone)).status).toBe(200);
    expect((await request(phone)).status).toBe(429);
  });

  it("refuses requests from untrusted origins", async () => {
    const response = await call(
      "/auth/password-reset/request",
      { identifier: AGENT_EMAIL },
      { origin: "https://evil.example.com" },
    );
    expect(response.status).toBe(403);
  });
});
