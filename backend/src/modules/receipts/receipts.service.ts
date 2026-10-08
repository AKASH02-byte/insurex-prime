import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import type { Database } from "../../config/database.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { AuthContext } from "../../middleware/auth.js";
import { isAdmin, requireAgentId, requireTenantId } from "../../middleware/role.js";
import { randomCode, withGeneratedCode } from "../../utils/codes.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { toDateOnly, toNumber } from "../../utils/format.js";
import { buildMeta, toDateFilter, toSkipTake } from "../../utils/pagination.js";
import { containsInsensitive } from "../../utils/search.js";
import { recordAudit } from "../audit-logs/audit-logs.service.js";
import type { createReceiptBodySchema, listReceiptsQuerySchema } from "./receipts.schemas.js";

const receiptInclude = {
  soldPolicy: {
    select: {
      id: true,
      policyNumber: true,
      premium: true,
      issueDate: true,
      expiryDate: true,
      policy: { select: { policyName: true, insuranceType: true } },
      customer: { select: { id: true, customerCode: true, fullName: true } },
      agent: { select: { id: true, agentCode: true, fullName: true } },
    },
  },
} as const satisfies Prisma.ReceiptInclude;

type ReceiptRecord = Prisma.ReceiptGetPayload<{ include: typeof receiptInclude }>;

const toReceiptDto = (receipt: ReceiptRecord) => ({
  id: receipt.id,
  receiptNumber: receipt.receiptNumber,
  soldPolicy: {
    id: receipt.soldPolicy.id,
    policyNumber: receipt.soldPolicy.policyNumber,
    policyName: receipt.soldPolicy.policy.policyName,
    insuranceType: receipt.soldPolicy.policy.insuranceType,
    premium: toNumber(receipt.soldPolicy.premium),
    issueDate: toDateOnly(receipt.soldPolicy.issueDate),
    expiryDate: toDateOnly(receipt.soldPolicy.expiryDate),
    customer: receipt.soldPolicy.customer,
    agent: receipt.soldPolicy.agent,
  },
  amount: toNumber(receipt.amount),
  paymentMethod: receipt.paymentMethod,
  paymentStatus: receipt.paymentStatus,
  issuedAt: receipt.issuedAt.toISOString(),
});

const receiptScope = (auth: AuthContext): Prisma.ReceiptWhereInput =>
  isAdmin(auth) ? {} : { soldPolicy: { agentId: requireAgentId(auth) } };

export async function listReceipts(
  db: Database,
  auth: AuthContext,
  query: z.infer<typeof listReceiptsQuerySchema>,
) {
  const where: Prisma.ReceiptWhereInput = {
    AND: [
      receiptScope(auth),
      isAdmin(auth) && query.agentId ? { soldPolicy: { agentId: query.agentId } } : {},
      query.soldPolicyId ? { soldPolicyId: query.soldPolicyId } : {},
      query.paymentMethod ? { paymentMethod: query.paymentMethod } : {},
      query.paymentStatus ? { paymentStatus: query.paymentStatus } : {},
      toDateFilter(query) ? { issuedAt: toDateFilter(query) } : {},
      query.search
        ? {
            OR: [
              { receiptNumber: containsInsensitive(query.search) },
              { soldPolicy: { policyNumber: containsInsensitive(query.search) } },
              { soldPolicy: { customer: { fullName: containsInsensitive(query.search) } } },
            ],
          }
        : {},
    ],
  };
  const [total, receipts] = await db.$transaction([
    db.receipt.count({ where }),
    db.receipt.findMany({
      where,
      include: receiptInclude,
      orderBy: [{ [query.sortBy]: query.order }, { id: "asc" }],
      ...toSkipTake(query),
    }),
  ]);
  return { items: receipts.map(toReceiptDto), meta: buildMeta(query.page, query.limit, total) };
}

export async function getReceipt(db: Database, auth: AuthContext, id: string) {
  const receipt = await db.receipt.findFirst({
    where: { id, ...receiptScope(auth) },
    include: receiptInclude,
  });
  if (!receipt) throw notFound("Receipt");
  return toReceiptDto(receipt);
}

/**
 * Records a payment. Runs under a row lock on the sold policy so concurrent
 * receipts cannot overpay; once fully paid the sale becomes PAID / ACTIVE.
 */
export async function createReceipt(
  db: Database,
  auth: AuthContext,
  request: FastifyRequest,
  body: z.infer<typeof createReceiptBodySchema>,
) {
  const sold = await db.soldPolicy.findFirst({
    where: {
      id: body.soldPolicyId,
      ...(isAdmin(auth) ? {} : { agentId: requireAgentId(auth) }),
    },
    select: { id: true, policyNumber: true },
  });
  if (!sold) throw notFound("Sold policy");

  const year = new Date().getUTCFullYear();
  const receipt = await withGeneratedCode(
    () => randomCode(`RCP-${year}`, 8),
    (receiptNumber) =>
      db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM sold_policies WHERE id = ${sold.id}::uuid FOR UPDATE`;
        const current = await tx.soldPolicy.findUniqueOrThrow({
          where: { id: sold.id },
          select: { premium: true, policyStatus: true, paymentStatus: true },
        });
        if (current.policyStatus === "CANCELLED") {
          throw conflict("Receipts cannot be added to a cancelled policy.");
        }

        const paid = await tx.receipt.aggregate({
          where: { soldPolicyId: sold.id, paymentStatus: "PAID" },
          _sum: { amount: true },
        });
        const alreadyPaid = paid._sum.amount ?? new Prisma.Decimal(0);
        const amount = new Prisma.Decimal(body.amount);
        const outstanding = current.premium.minus(alreadyPaid);
        if (body.paymentStatus === "PAID" && amount.greaterThan(outstanding)) {
          throw badRequest(`Amount exceeds the outstanding premium of ${outstanding.toFixed(2)}.`);
        }

        const created = await tx.receipt.create({
          data: {
            tenantId: requireTenantId(auth),
            receiptNumber,
            soldPolicyId: sold.id,
            amount,
            paymentMethod: body.paymentMethod,
            paymentStatus: body.paymentStatus,
          },
          include: receiptInclude,
        });

        if (
          body.paymentStatus === "PAID" &&
          alreadyPaid.plus(amount).greaterThanOrEqualTo(current.premium)
        ) {
          await tx.soldPolicy.update({
            where: { id: sold.id },
            data: {
              paymentStatus: "PAID",
              ...(current.policyStatus === "PENDING" ? { policyStatus: "ACTIVE" } : {}),
            },
          });
        }

        await recordAudit(tx, request, {
          action: "receipt.create",
          entity: "Receipt",
          entityId: created.id,
          metadata: { receiptNumber, policyNumber: sold.policyNumber },
        });
        return created;
      }),
  );
  return toReceiptDto(receipt);
}
