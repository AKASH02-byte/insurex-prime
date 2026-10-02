import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import type { Database } from "../../config/database.js";
import { Prisma, type Policy } from "../../generated/prisma/client.js";
import type { PolicyStatus } from "../../generated/prisma/enums.js";
import type { AuthContext } from "../../middleware/auth.js";
import { isSuperAdmin } from "../../middleware/role.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { toNumber } from "../../utils/format.js";
import { buildMeta, toDateFilter, toSkipTake } from "../../utils/pagination.js";
import { containsInsensitive } from "../../utils/search.js";
import { changedFields, recordAudit } from "../audit-logs/audit-logs.service.js";
import {
  categoryDetailsSchema,
  type CategoryDetails,
  type createPolicyBodySchema,
  type listPoliciesQuerySchema,
  type updatePolicyBodySchema,
} from "./policies.schemas.js";

type PolicyWithCount = Policy & { _count?: { soldPolicies: number } };

function parseDetails(value: Prisma.JsonValue | null): CategoryDetails | null {
  const parsed = categoryDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const toPolicyDto = (policy: PolicyWithCount, includeSales: boolean) => ({
  id: policy.id,
  policyCode: policy.policyCode,
  policyName: policy.policyName,
  insuranceType: policy.insuranceType,
  description: policy.description,
  coverageAmount: toNumber(policy.coverageAmount),
  premium: toNumber(policy.premium),
  premiumFrequency: policy.premiumFrequency,
  durationMonths: policy.durationMonths,
  eligibility: policy.eligibility,
  benefits: policy.benefits,
  terms: policy.terms,
  categoryDetails: parseDetails(policy.categoryDetails),
  status: policy.status,
  policiesSold: includeSales ? (policy._count?.soldPolicies ?? 0) : null,
  createdAt: policy.createdAt.toISOString(),
  updatedAt: policy.updatedAt.toISOString(),
});

/** Agents can only ever see ACTIVE catalog policies. */
const policyScope = (auth: AuthContext): Prisma.PolicyWhereInput =>
  isSuperAdmin(auth) ? {} : { status: "ACTIVE" };

export async function listPolicies(
  db: Database,
  auth: AuthContext,
  query: z.infer<typeof listPoliciesQuerySchema>,
) {
  const admin = isSuperAdmin(auth);
  const premium =
    query.premiumMin !== undefined || query.premiumMax !== undefined
      ? {
          ...(query.premiumMin !== undefined ? { gte: query.premiumMin } : {}),
          ...(query.premiumMax !== undefined ? { lte: query.premiumMax } : {}),
        }
      : undefined;
  const where: Prisma.PolicyWhereInput = {
    AND: [
      policyScope(auth),
      admin && query.status ? { status: query.status } : {},
      query.insuranceType ? { insuranceType: query.insuranceType } : {},
      query.premiumFrequency ? { premiumFrequency: query.premiumFrequency } : {},
      premium ? { premium } : {},
      toDateFilter(query) ? { createdAt: toDateFilter(query) } : {},
      query.search
        ? {
            OR: [
              { policyName: containsInsensitive(query.search) },
              { policyCode: containsInsensitive(query.search) },
            ],
          }
        : {},
    ],
  };
  const [total, policies] = await db.$transaction([
    db.policy.count({ where }),
    db.policy.findMany({
      where,
      ...(admin ? { include: { _count: { select: { soldPolicies: true } } } } : {}),
      orderBy: [{ [query.sortBy]: query.order }, { id: "asc" }],
      ...toSkipTake(query),
    }),
  ]);
  return {
    items: policies.map((policy) => toPolicyDto(policy, admin)),
    meta: buildMeta(query.page, query.limit, total),
  };
}

export async function getPolicy(db: Database, auth: AuthContext, id: string) {
  const admin = isSuperAdmin(auth);
  const policy = await db.policy.findFirst({
    where: { id, ...policyScope(auth) },
    ...(admin ? { include: { _count: { select: { soldPolicies: true } } } } : {}),
  });
  if (!policy) throw notFound("Policy");
  return toPolicyDto(policy, admin);
}

async function assertCodeAvailable(db: Database, policyCode: string, exceptId?: string) {
  const existing = await db.policy.findUnique({ where: { policyCode }, select: { id: true } });
  if (existing && existing.id !== exceptId) {
    throw conflict(`Policy code ${policyCode} is already in use.`);
  }
}

const detailsJson = (details: CategoryDetails | null | undefined) =>
  details ? (details as Prisma.InputJsonValue) : Prisma.DbNull;

export async function createPolicy(
  db: Database,
  request: FastifyRequest,
  body: z.infer<typeof createPolicyBodySchema>,
) {
  await assertCodeAvailable(db, body.policyCode);
  const policy = await db.$transaction(async (tx) => {
    const created = await tx.policy.create({
      data: { ...body, categoryDetails: detailsJson(body.categoryDetails) },
      include: { _count: { select: { soldPolicies: true } } },
    });
    await recordAudit(tx, request, {
      action: "policy.create",
      entity: "Policy",
      entityId: created.id,
      metadata: { policyCode: created.policyCode },
    });
    return created;
  });
  return toPolicyDto(policy, true);
}

export async function updatePolicy(
  db: Database,
  request: FastifyRequest,
  id: string,
  body: z.infer<typeof updatePolicyBodySchema>,
) {
  const existing = await db.policy.findUnique({ where: { id } });
  if (!existing) throw notFound("Policy");
  if (body.policyCode && body.policyCode !== existing.policyCode) {
    await assertCodeAvailable(db, body.policyCode, id);
  }

  // Keep category details consistent with the (possibly new) insurance type.
  const insuranceType = body.insuranceType ?? existing.insuranceType;
  const details =
    body.categoryDetails !== undefined
      ? body.categoryDetails
      : parseDetails(existing.categoryDetails);
  if (details && details.kind !== insuranceType) {
    if (body.categoryDetails) {
      throw badRequest("categoryDetails.kind must match insuranceType.");
    }
  }
  const nextDetails = details && details.kind === insuranceType ? details : null;
  const { categoryDetails: _categoryDetails, ...fields } = body;

  const policy = await db.$transaction(async (tx) => {
    const updated = await tx.policy.update({
      where: { id },
      data: { ...fields, categoryDetails: detailsJson(nextDetails) },
      include: { _count: { select: { soldPolicies: true } } },
    });
    await recordAudit(tx, request, {
      action: "policy.update",
      entity: "Policy",
      entityId: id,
      metadata: { fields: changedFields(body) },
    });
    return updated;
  });
  return toPolicyDto(policy, true);
}

export async function setPolicyStatus(
  db: Database,
  request: FastifyRequest,
  id: string,
  status: PolicyStatus,
) {
  if (!(await db.policy.findUnique({ where: { id }, select: { id: true } }))) {
    throw notFound("Policy");
  }
  const policy = await db.$transaction(async (tx) => {
    const updated = await tx.policy.update({
      where: { id },
      data: { status },
      include: { _count: { select: { soldPolicies: true } } },
    });
    await recordAudit(tx, request, {
      action: "policy.status",
      entity: "Policy",
      entityId: id,
      metadata: { status },
    });
    return updated;
  });
  return toPolicyDto(policy, true);
}

/** Policies that have been sold cannot be deleted; deactivate them instead. */
export async function deletePolicy(db: Database, request: FastifyRequest, id: string) {
  const policy = await db.policy.findUnique({
    where: { id },
    include: { _count: { select: { soldPolicies: true } } },
  });
  if (!policy) throw notFound("Policy");
  if (policy._count.soldPolicies > 0) {
    throw conflict(
      `Policy has been sold ${policy._count.soldPolicies} times and cannot be deleted. Set it INACTIVE instead.`,
    );
  }
  await db.$transaction(async (tx) => {
    await tx.policy.delete({ where: { id } });
    await recordAudit(tx, request, {
      action: "policy.delete",
      entity: "Policy",
      entityId: id,
      metadata: { policyCode: policy.policyCode },
    });
  });
}
