import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { App } from "../src/app.js";
import type { Database } from "../src/config/database.js";
import {
  bearer,
  createTestApp,
  hasTestDatabase,
  resetDatabase,
  SUPER_ADMIN_EMAIL,
  tokenFor,
} from "./helpers.js";

const ADMIN = bearer(tokenFor("uid-admin", SUPER_ADMIN_EMAIL));
const AGENT_A_EMAIL = "agent.a@test.example.com";
const AGENT_B_EMAIL = "agent.b@test.example.com";
const AGENT_A = bearer(tokenFor("uid-agent-a", AGENT_A_EMAIL));
const AGENT_B = bearer(tokenFor("uid-agent-b", AGENT_B_EMAIL));

const healthPolicy = {
  policyCode: "TST-HLT-1",
  policyName: "Test Health",
  insuranceType: "HEALTH",
  coverageAmount: 500000,
  premium: 10000,
  durationMonths: 12,
  benefits: ["Cashless"],
  categoryDetails: {
    kind: "HEALTH",
    planType: "INDIVIDUAL",
    sumInsured: 500000,
    hospitalizationCoverage: "Private room",
    waitingPeriod: "30 days",
    ageEligibility: "18-60",
  },
};

describe.skipIf(!hasTestDatabase)("InsureX API (PostgreSQL integration)", () => {
  let app: App;
  let db: Database;

  // Shared fixtures created in beforeEach.
  let agentAId: string;
  let agentBId: string;
  let activePolicyId: string;
  let inactivePolicyId: string;

  const call = async (
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    headers: Record<string, string> = {},
    payload?: unknown,
  ) => {
    const response = await app.inject({
      method,
      url: `/api/v1${url}`,
      headers,
      ...(payload !== undefined ? { payload: payload as object } : {}),
    });
    return { status: response.statusCode, body: response.json(), headers: response.headers };
  };

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await resetDatabase(db);

    const agentA = await call("POST", "/agents", ADMIN, {
      fullName: "Agent A",
      email: AGENT_A_EMAIL,
      phone: "+91 90000 00001",
    });
    expect(agentA.status).toBe(201);
    agentAId = agentA.body.data.id;

    const agentB = await call("POST", "/agents", ADMIN, {
      fullName: "Agent B",
      email: AGENT_B_EMAIL,
      phone: "+91 90000 00002",
    });
    agentBId = agentB.body.data.id;

    const active = await call("POST", "/policies", ADMIN, healthPolicy);
    expect(active.status).toBe(201);
    activePolicyId = active.body.data.id;

    const inactive = await call("POST", "/policies", ADMIN, {
      ...healthPolicy,
      policyCode: "TST-MTR-OFF",
      policyName: "Retired Motor",
      insuranceType: "MOTOR",
      premium: 5000,
      status: "INACTIVE",
      categoryDetails: {
        kind: "MOTOR",
        vehicleType: "PRIVATE_CAR",
        coverageType: "COMPREHENSIVE",
        ownDamage: "IDV",
        thirdPartyCoverage: "Unlimited",
        vehicleEligibility: "Up to 10 years",
      },
    });
    inactivePolicyId = inactive.body.data.id;
  });

  // ─── Health & errors ────────────────────────────────────────────────────────
  it("reports health with the database up", async () => {
    const { status, body, headers } = await call("GET", "/health");
    expect(status).toBe(200);
    expect(body.data).toMatchObject({ status: "ok", database: "up" });
    expect(headers["x-request-id"]).toBeTruthy();
  });

  it("accepts collection routes with or without a trailing slash", async () => {
    expect((await call("GET", "/policies", ADMIN)).status).toBe(200);
    expect((await call("GET", "/policies/", ADMIN)).status).toBe(200);
  });

  it("serves the OpenAPI document", async () => {
    const response = await app.inject({ method: "GET", url: "/docs/json" });
    expect(response.statusCode).toBe(200);
    const doc = response.json();
    expect(doc.paths["/api/v1/sold-policies"]).toBeDefined();
    expect(doc.components.securitySchemes.bearerAuth).toBeDefined();
  });

  it("returns the error envelope with a request id for validation errors", async () => {
    const { status, body } = await call("POST", "/policies", ADMIN, { policyName: "x" });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.requestId).toBeTruthy();
  });

  // ─── Authentication ─────────────────────────────────────────────────────────
  it("requires a bearer token", async () => {
    expect((await call("GET", "/auth/me")).status).toBe(401);
    expect((await call("GET", "/auth/me", bearer("garbage"))).body.error.code).toBe(
      "INVALID_TOKEN",
    );
    expect((await call("GET", "/auth/me", bearer("expired"))).body.error.code).toBe(
      "TOKEN_EXPIRED",
    );
  });

  it("rejects unverified emails and unknown accounts", async () => {
    const unverified = await call(
      "GET",
      "/auth/me",
      bearer(`valid|uid-x|${SUPER_ADMIN_EMAIL}|unverified`),
    );
    expect(unverified.status).toBe(403);

    const stranger = await call(
      "POST",
      "/auth/verify",
      bearer(tokenFor("uid-z", "stranger@example.com")),
    );
    expect(stranger.status).toBe(403);
    expect(stranger.body.error.code).toBe("ACCOUNT_NOT_PROVISIONED");
    expect(await db.user.count({ where: { email: "stranger@example.com" } })).toBe(0);
  });

  it("bootstraps the super admin and links agents by email on first sign-in", async () => {
    const admin = await call("POST", "/auth/verify", ADMIN);
    expect(admin.status).toBe(200);
    expect(admin.body.data).toMatchObject({ role: "SUPER_ADMIN", agent: null });

    const agent = await call("POST", "/auth/verify", AGENT_A);
    expect(agent.status).toBe(200);
    expect(agent.body.data.role).toBe("AGENT");
    expect(agent.body.data.agent.id).toBe(agentAId);
    const user = await db.user.findUnique({ where: { email: AGENT_A_EMAIL } });
    expect(user?.firebaseUid).toBe("uid-agent-a");

    // A different Firebase account using the same email is refused.
    const impostor = await call("GET", "/auth/me", bearer(tokenFor("uid-other", AGENT_A_EMAIL)));
    expect(impostor.status).toBe(403);
  });

  it("blocks inactive agents", async () => {
    await call("PATCH", `/agents/${agentAId}/status`, ADMIN, { status: "SUSPENDED" });
    const { status, body } = await call("GET", "/auth/me", AGENT_A);
    expect(status).toBe(403);
    expect(body.error.code).toBe("ACCOUNT_DISABLED");
  });

  // ─── Role-based access ──────────────────────────────────────────────────────
  it("keeps admin-only endpoints away from agents", async () => {
    expect((await call("GET", "/agents", AGENT_A)).status).toBe(403);
    expect((await call("POST", "/policies", AGENT_A, healthPolicy)).status).toBe(403);
    expect((await call("GET", "/reports/sales", AGENT_A)).status).toBe(403);
    expect((await call("GET", "/audit-logs", AGENT_A)).status).toBe(403);
    expect((await call("GET", `/agents/${agentBId}`, AGENT_A)).status).toBe(404);
    expect((await call("GET", `/agents/${agentAId}`, AGENT_A)).status).toBe(200);
  });

  it("ignores an agent-supplied assignedAgentId and scopes customers", async () => {
    const created = await call("POST", "/customers", AGENT_A, {
      fullName: "Customer One",
      phone: "+91 91111 11111",
      assignedAgentId: agentBId,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.assignedAgent.id).toBe(agentAId);

    const otherAgentsCustomer = await call("POST", "/customers", AGENT_B, {
      fullName: "Customer Two",
      phone: "+91 92222 22222",
    });

    const listA = await call("GET", "/customers", AGENT_A);
    expect(listA.body.meta.total).toBe(1);
    expect(listA.body.data[0].fullName).toBe("Customer One");

    const peek = await call("GET", `/customers/${otherAgentsCustomer.body.data.id}`, AGENT_A);
    expect(peek.status).toBe(404);
    const edit = await call("PATCH", `/customers/${otherAgentsCustomer.body.data.id}`, AGENT_A, {
      fullName: "Hijacked",
    });
    expect(edit.status).toBe(404);

    const adminList = await call("GET", "/customers?agentId=" + agentBId, ADMIN);
    expect(adminList.body.meta.total).toBe(1);
  });

  it("shows agents only ACTIVE policies", async () => {
    const list = await call("GET", "/policies?status=INACTIVE", AGENT_A);
    expect(list.body.data.map((policy: { status: string }) => policy.status)).toEqual(["ACTIVE"]);
    expect(list.body.data[0].policiesSold).toBeNull();
    expect((await call("GET", `/policies/${inactivePolicyId}`, AGENT_A)).status).toBe(404);
    expect((await call("GET", `/policies/${inactivePolicyId}`, ADMIN)).status).toBe(200);
  });

  // ─── Sales & receipts ───────────────────────────────────────────────────────
  it("records sales with server-side agent, premium and expiry", async () => {
    const mine = await call("POST", "/customers", AGENT_A, {
      fullName: "Mine",
      phone: "+91 93333 33333",
    });
    const theirs = await call("POST", "/customers", AGENT_B, {
      fullName: "Theirs",
      phone: "+91 94444 44444",
    });

    const sale = await call("POST", "/sold-policies", AGENT_A, {
      policyId: activePolicyId,
      customerId: mine.body.data.id,
      issueDate: "2026-01-01",
      agentId: agentBId,
    });
    expect(sale.status).toBe(201);
    expect(sale.body.data).toMatchObject({
      premium: 10000,
      expiryDate: "2026-12-31",
      policyStatus: "PENDING",
      paymentStatus: "PENDING",
    });
    expect(sale.body.data.agent.id).toBe(agentAId);

    const override = await call("POST", "/sold-policies", AGENT_A, {
      policyId: activePolicyId,
      customerId: mine.body.data.id,
      premium: 1,
    });
    expect(override.status).toBe(403);

    const crossSale = await call("POST", "/sold-policies", AGENT_A, {
      policyId: activePolicyId,
      customerId: theirs.body.data.id,
    });
    expect(crossSale.status).toBe(404);

    const inactiveSale = await call("POST", "/sold-policies", AGENT_A, {
      policyId: inactivePolicyId,
      customerId: mine.body.data.id,
    });
    expect(inactiveSale.status).toBe(404);

    expect((await call("GET", "/sold-policies", AGENT_B)).body.meta.total).toBe(0);
    expect(
      (
        await call("PATCH", `/sold-policies/${sale.body.data.id}`, AGENT_A, {
          policyStatus: "ACTIVE",
        })
      ).status,
    ).toBe(403);
  });

  it("rejects overpayment and activates a fully paid policy", async () => {
    const customer = await call("POST", "/customers", AGENT_A, {
      fullName: "Payer",
      phone: "+91 95555 55555",
    });
    const sale = await call("POST", "/sold-policies", AGENT_A, {
      policyId: activePolicyId,
      customerId: customer.body.data.id,
    });
    const soldPolicyId = sale.body.data.id;

    const tooMuch = await call("POST", "/receipts", AGENT_A, {
      soldPolicyId,
      amount: 10001,
      paymentMethod: "UPI",
    });
    expect(tooMuch.status).toBe(400);

    expect(
      (
        await call("POST", "/receipts", AGENT_A, {
          soldPolicyId,
          amount: 4000,
          paymentMethod: "CASH",
        })
      ).status,
    ).toBe(201);
    expect(
      (await call("GET", `/sold-policies/${soldPolicyId}`, AGENT_A)).body.data.paymentStatus,
    ).toBe("PENDING");

    await call("POST", "/receipts", AGENT_A, { soldPolicyId, amount: 6000, paymentMethod: "UPI" });
    const paid = await call("GET", `/sold-policies/${soldPolicyId}`, AGENT_A);
    expect(paid.body.data).toMatchObject({
      paymentStatus: "PAID",
      policyStatus: "ACTIVE",
      amountPaid: 10000,
    });
    expect(paid.body.data.receipts).toHaveLength(2);

    expect((await call("GET", "/receipts", AGENT_B)).body.meta.total).toBe(0);
    expect(
      (await call("POST", "/receipts", AGENT_B, { soldPolicyId, amount: 1, paymentMethod: "UPI" }))
        .status,
    ).toBe(404);
  });

  it("refuses to delete records with history", async () => {
    const customer = await call("POST", "/customers", AGENT_A, {
      fullName: "History",
      phone: "+91 96666 66666",
    });
    await call("POST", "/sold-policies", AGENT_A, {
      policyId: activePolicyId,
      customerId: customer.body.data.id,
    });
    expect((await call("DELETE", `/policies/${activePolicyId}`, ADMIN)).status).toBe(409);
    expect((await call("DELETE", `/customers/${customer.body.data.id}`, AGENT_A)).status).toBe(409);
    expect((await call("DELETE", `/agents/${agentAId}`, ADMIN)).status).toBe(409);
    expect((await call("DELETE", `/policies/${inactivePolicyId}`, ADMIN)).status).toBe(200);
  });

  // ─── Query features ─────────────────────────────────────────────────────────
  it("filters, searches, sorts and paginates in the database", async () => {
    for (const [index, premium] of [2000, 8000, 30000].entries()) {
      await call("POST", "/policies", ADMIN, {
        ...healthPolicy,
        policyCode: `TST-EXTRA-${index}`,
        policyName: `Extra Plan ${index}`,
        premium,
      });
    }
    const search = await call("GET", "/policies?search=extra&sortBy=premium&order=asc", ADMIN);
    expect(search.body.data.map((policy: { premium: number }) => policy.premium)).toEqual([
      2000, 8000, 30000,
    ]);

    const range = await call(
      "GET",
      "/policies?premiumMin=5000&premiumMax=20000&insuranceType=HEALTH",
      ADMIN,
    );
    expect(
      range.body.data.every(
        (policy: { premium: number }) => policy.premium >= 5000 && policy.premium <= 20000,
      ),
    ).toBe(true);

    const page = await call("GET", "/policies?page=2&limit=2&sortBy=policyCode&order=asc", ADMIN);
    expect(page.body.meta).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(page.body.data).toHaveLength(2);

    expect((await call("GET", "/policies?limit=1000", ADMIN)).status).toBe(400);
    expect((await call("GET", "/policies?from=2026-02-01&to=2026-01-01", ADMIN)).status).toBe(400);
  });

  // ─── Analytics ──────────────────────────────────────────────────────────────
  it("scopes dashboard statistics by role", async () => {
    const a = await call("POST", "/customers", AGENT_A, {
      fullName: "A1",
      phone: "+91 97777 77777",
    });
    const b = await call("POST", "/customers", AGENT_B, {
      fullName: "B1",
      phone: "+91 98888 88888",
    });
    await call("POST", "/sold-policies", AGENT_A, {
      policyId: activePolicyId,
      customerId: a.body.data.id,
      issueDate: "2026-03-10",
    });
    await call("POST", "/sold-policies", AGENT_A, {
      policyId: activePolicyId,
      customerId: a.body.data.id,
      issueDate: "2026-04-10",
    });
    await call("POST", "/sold-policies", AGENT_B, {
      policyId: activePolicyId,
      customerId: b.body.data.id,
      issueDate: "2026-04-15",
    });

    const admin = await call("GET", "/dashboard/summary", ADMIN);
    expect(admin.body.data).toMatchObject({
      policiesSold: 3,
      totalPremium: 30000,
      totalAgents: 2,
      totalCustomers: 2,
      totalPolicies: 2,
      activePolicies: 1,
    });

    const agent = await call("GET", "/dashboard/summary", AGENT_A);
    expect(agent.body.data).toMatchObject({
      policiesSold: 2,
      totalPremium: 20000,
      totalAgents: null,
      totalCustomers: 1,
      totalPolicies: 1,
    });

    const series = await call(
      "GET",
      "/dashboard/policy-sales?interval=month&from=2026-01-01&to=2026-06-30",
      ADMIN,
    );
    expect(
      series.body.data.points.map((point: { policiesSold: number }) => point.policiesSold),
    ).toEqual([0, 0, 1, 2, 0, 0]);

    const distribution = await call("GET", "/dashboard/policy-distribution", AGENT_A);
    expect(distribution.body.data).toEqual([
      { insuranceType: "HEALTH", policiesSold: 2, premium: 20000, percentage: 100 },
      { insuranceType: "MOTOR", policiesSold: 0, premium: 0, percentage: 0 },
    ]);

    const performance = await call("GET", "/dashboard/agent-performance", AGENT_A);
    expect(performance.body.data).toHaveLength(1);
    expect(performance.body.data[0]).toMatchObject({ agentId: agentAId, policiesSold: 2 });

    const recent = await call("GET", "/dashboard/recent-sales?limit=5", AGENT_B);
    expect(recent.body.data).toHaveLength(1);

    const report = await call("GET", "/reports/policies?sortBy=policiesSold", ADMIN);
    expect(report.body.data[0]).toMatchObject({ policyId: activePolicyId, policiesSold: 3 });
    const agentsReport = await call("GET", "/reports/agents", ADMIN);
    expect(agentsReport.body.meta.total).toBe(2);
    const sales = await call(
      "GET",
      `/reports/sales?agentId=${agentBId}&from=2026-01-01&to=2026-12-31`,
      ADMIN,
    );
    expect(sales.status).toBe(200);
    expect(sales.body.data.summary.policiesSold).toBe(1);
  });

  // ─── Audit ──────────────────────────────────────────────────────────────────
  it("writes audit logs without credentials", async () => {
    await call("POST", "/auth/verify", AGENT_A);
    const logs = await call("GET", "/audit-logs?entity=Agent&order=asc", ADMIN);
    expect(logs.body.data.map((log: { action: string }) => log.action)).toEqual([
      "agent.create",
      "agent.create",
    ]);
    const all = await db.auditLog.findMany();
    expect(all.some((log) => log.action === "auth.login")).toBe(true);
    expect(JSON.stringify(all)).not.toContain("valid|");
  });
});
