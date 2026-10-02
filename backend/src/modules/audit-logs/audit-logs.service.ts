import type { FastifyRequest } from "fastify";
import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../config/database.js";

type DbClient = Database | Prisma.TransactionClient;

export interface AuditEntry {
  action: string; // e.g. "customer.create"
  entity: string; // e.g. "Customer"
  entityId?: string | null;
  /** Non-sensitive context only: codes, changed field names. Never tokens or secrets. */
  metadata?: Prisma.InputJsonValue;
  /** Defaults to the authenticated user. */
  userId?: string | null;
}

export async function recordAudit(db: DbClient, request: FastifyRequest, entry: AuditEntry) {
  await db.auditLog.create({
    data: {
      userId: entry.userId ?? request.auth?.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      ...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}),
      ipAddress: request.ip,
      requestId: request.id,
    },
  });
}

/** Names of fields present in an update payload — values are deliberately not logged. */
export const changedFields = (input: Record<string, unknown>) =>
  Object.keys(input).filter((key) => input[key] !== undefined);
