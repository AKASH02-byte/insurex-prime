import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import type { Database } from "../../config/database.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { AuthContext } from "../../middleware/auth.js";
import { isSuperAdmin, requireAgentId } from "../../middleware/role.js";
import { randomCode, withGeneratedCode } from "../../utils/codes.js";
import { badRequest, conflict, forbidden, notFound } from "../../utils/errors.js";
import { parseDateOnly, toDateOnly, toNumber } from "../../utils/format.js";
import { buildMeta, toDateFilter, toSkipTake } from "../../utils/pagination.js";
import { containsInsensitive } from "../../utils/search.js";
import { changedFields, recordAudit } from "../audit-logs/audit-logs.service.js";
import type {
  createSoldPolicyBodySchema,
  listSoldPoliciesQuerySchema,
  updateSoldPolicyBodySchema,
} from "./sold-policies.schemas.js";

export const soldPolicyInclude = {
  policy: { select: { id: true, policyCode: true, policyName: true, insuranceType: true } },
  customer: { select: { id: true, customerCode: true, fullName: true } },
  agent: { select: { id: true, agentCode: true, fullName: true } },
  receipts: {
    select: {
      id: true,
      receiptNumber: true,
      amount: true,
      paymentMethod: true,
      paymentStatus: true,
      issuedAt: true,
    },
    orderBy: { issuedAt: "asc" },
  },
} as const satisfies Prisma.SoldPolicyInclude;

type SoldPolicyRecord = Prisma.SoldPolicyGetPayload<{ include: typeof soldPolicyInclude }>;

export const toSoldPolicyDto = (sold: SoldPolicyRecord) => ({
  id: sold.id,
  policyNumber: sold.policyNumber,
  policy: sold.policy,
  customer: sold.customer,
  agent: sold.agent,
  premium: toNumber(sold.premium),
  amountPaid: sold.receipts
    .filter((receipt) => receipt.paymentStatus === "PAID")
    .reduce((total, receipt) => total + toNumber(receipt.amount), 0),
  issueDate: toDateOnly(sold.issueDate),
  expiryDate: toDateOnly(sold.expiryDate),
  paymentStatus: sold.paymentStatus,
  policyStatus: sold.policyStatus,
  createdAt: sold.createdAt.toISOString(),
  updatedAt: sold.updatedAt.toISOString(),
});

const toSoldPolicyDetailDto = (sold: SoldPolicyRecord) => ({
  ...toSoldPolicyDto(sold),
  receipts: sold.receipts.map((receipt) => ({
    ...receipt,
    amount: toNumber(receipt.amount),
    issuedAt: receipt.issuedAt.toISOString(),
  })),
});

/** Agents only ever see their own sales. */
export const soldPolicyScope = (auth: AuthContext): Prisma.SoldPolicyWhereInput =>
  isSuperAdmin(auth) ? {} : { agentId: requireAgentId(auth) };

export async function listSoldPolicies(
  db: Database,
  auth: AuthContext,
  query: z.infer<typeof listSoldPoliciesQuerySchema>,
) {
  const where: Prisma.SoldPolicyWhereInput = {
    AND: [
      soldPolicyScope(auth),
      isSuperAdmin(auth) && query.agentId ? { agentId: query.agentId } : {},
      query.customerId ? { customerId: query.customerId } : {},
      query.policyId ? { policyId: query.policyId } : {},
      query.policyStatus ? { policyStatus: query.policyStatus } : {},
      query.paymentStatus ? { paymentStatus: query.paymentStatus } : {},
      query.insuranceType ? { policy: { insuranceType: query.insuranceType } } : {},
      toDateFilter(query) ? { issueDate: toDateFilter(query) } : {},
      query.search
        ? {
            OR: [
              { policyNumber: containsInsensitive(query.search) },
              { customer: { fullName: containsInsensitive(query.search) } },
              { customer: { customerCode: containsInsensitive(query.search) } },
              { policy: { policyName: containsInsensitive(query.search) } },
              { policy: { policyCode: containsInsensitive(query.search) } },
            ],
          }
        : {},
    ],
  };
  const [total, rows] = await db.$transaction([
    db.soldPolicy.count({ where }),
    db.soldPolicy.findMany({
      where,
      include: soldPolicyInclude,
      orderBy: [{ [query.sortBy]: query.order }, { id: "asc" }],
      ...toSkipTake(query),
    }),
  ]);
  return { items: rows.map(toSoldPolicyDto), meta: buildMeta(query.page, query.limit, total) };
}

export async function getSoldPolicy(db: Database, auth: AuthContext, id: string) {
  const sold = await db.soldPolicy.findFirst({
    where: { id, ...soldPolicyScope(auth) },
    include: soldPolicyInclude,
  });
  if (!sold) throw notFound("Sold policy");
  return toSoldPolicyDetailDto(sold);
}

/** Last day of cover: issue date + duration − 1 day (e.g. 1 Jan → 31 Dec). */
export function computeExpiryDate(issueDate: Date, durationMonths: number): Date {
  const expiry = new Date(issueDate);
  expiry.setUTCMonth(expiry.getUTCMonth() + durationMonths);
  expiry.setUTCDate(expiry.getUTCDate() - 1);
  return expiry;
}

export async function createSoldPolicy(
  db: Database,
  auth: AuthContext,
  request: FastifyRequest,
  body: z.infer<typeof createSoldPolicyBodySchema>,
) {
  const admin = isSuperAdmin(auth);

  const policy = await db.policy.findUnique({ where: { id: body.policyId } });
  if (!policy || (!admin && policy.status !== "ACTIVE")) throw notFound("Policy");
  if (policy.status !== "ACTIVE") throw conflict("INACTIVE policies cannot be sold.");

  const customer = await db.customer.findUnique({ where: { id: body.customerId } });
  // Agents may only sell to their own customers; hide others' customers entirely.
  if (!customer || (!admin && customer.assignedAgentId !== auth.agentId)) {
    throw notFound("Customer");
  }

  let agentId: string;
  if (admin) {
    const requested = body.agentId ?? customer.assignedAgentId;
    if (!requested) {
      throw badRequest("agentId is required because the customer has no assigned agent.");
    }
    if (customer.assignedAgentId && customer.assignedAgentId !== requested) {
      throw badRequest("The customer is assigned to a different agent.");
    }
    const agent = await db.agent.findUnique({ where: { id: requested }, select: { status: true } });
    if (!agent) throw badRequest("agentId does not refer to an existing agent.");
    if (agent.status !== "ACTIVE")
      throw badRequest("Sales can only be recorded for ACTIVE agents.");
    agentId = requested;
  } else {
    agentId = requireAgentId(auth);
  }
  if (!admin && body.premium !== undefined) {
    throw forbidden("Agents cannot override the catalog premium.");
  }

  const issueDate = body.issueDate
    ? parseDateOnly(body.issueDate)
    : parseDateOnly(new Date().toISOString());
  const expiryDate = computeExpiryDate(issueDate, policy.durationMonths);
  const year = issueDate.getUTCFullYear();

  const sold = await withGeneratedCode(
    () => randomCode(`POL-${year}`, 8),
    (policyNumber) =>
      db.$transaction(async (tx) => {
        const created = await tx.soldPolicy.create({
          data: {
            policyNumber,
            policyId: policy.id,
            customerId: customer.id,
            agentId,
            premium: body.premium ?? policy.premium,
            issueDate,
            expiryDate,
          },
          include: soldPolicyInclude,
        });
        await recordAudit(tx, request, {
          action: "soldPolicy.create",
          entity: "SoldPolicy",
          entityId: created.id,
          metadata: {
            policyNumber,
            policyCode: policy.policyCode,
            customerId: customer.id,
            agentId,
          },
        });
        return created;
      }),
  );
  return toSoldPolicyDetailDto(sold);
}

export async function updateSoldPolicy(
  db: Database,
  request: FastifyRequest,
  id: string,
  body: z.infer<typeof updateSoldPolicyBodySchema>,
) {
  const existing = await db.soldPolicy.findUnique({ where: { id } });
  if (!existing) throw notFound("Sold policy");

  const issueDate = body.issueDate ? parseDateOnly(body.issueDate) : existing.issueDate;
  const expiryDate = body.expiryDate ? parseDateOnly(body.expiryDate) : existing.expiryDate;
  if (expiryDate <= issueDate) throw badRequest("expiryDate must be after issueDate.");

  const sold = await db.$transaction(async (tx) => {
    const updated = await tx.soldPolicy.update({
      where: { id },
      data: {
        ...(body.policyStatus ? { policyStatus: body.policyStatus } : {}),
        ...(body.paymentStatus ? { paymentStatus: body.paymentStatus } : {}),
        ...(body.premium !== undefined ? { premium: body.premium } : {}),
        issueDate,
        expiryDate,
      },
      include: soldPolicyInclude,
    });
    await recordAudit(tx, request, {
      action: "soldPolicy.update",
      entity: "SoldPolicy",
      entityId: id,
      metadata: { fields: changedFields(body) },
    });
    return updated;
  });
  return toSoldPolicyDetailDto(sold);
}
