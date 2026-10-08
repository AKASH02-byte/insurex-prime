import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { requireAuth, tenantAdminOnly } from "../../middleware/role.js";
import {
  buildMeta,
  dateRangeQuerySchema,
  orderQuerySchema,
  paginationQuerySchema,
  toDateFilter,
  toSkipTake,
} from "../../utils/pagination.js";
import { errorResponses, paginated, paginatedSchema } from "../../utils/response.js";

const auditLogSchema = z
  .object({
    id: z.uuid(),
    action: z.string(),
    entity: z.string(),
    entityId: z.string().nullable(),
    metadata: z.unknown().nullable(),
    ipAddress: z.string().nullable(),
    requestId: z.string().nullable(),
    user: z.object({ id: z.uuid(), email: z.string(), role: z.string() }).nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "AuditLog" });

const listAuditLogsQuerySchema = paginationQuerySchema
  .extend(orderQuerySchema.shape)
  .extend(dateRangeQuerySchema.shape)
  .extend({
    userId: z.uuid().optional(),
    action: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .optional()
      .describe("Exact action, e.g. policy.update"),
    entity: z.string().trim().min(1).max(60).optional().describe("e.g. Policy"),
    entityId: z.string().trim().min(1).max(60).optional(),
  });

export const auditLogRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "",
    {
      preHandler: tenantAdminOnly,
      schema: {
        tags: ["Audit Logs"],
        security: [{ bearerAuth: [] }],
        summary: "List audit logs (SUPER_ADMIN)",
        querystring: listAuditLogsQuerySchema,
        response: { 200: paginatedSchema(auditLogSchema), ...errorResponses },
      },
    },
    async (request) => {
      const query = request.query;
      const createdAt = toDateFilter(query);
      const tenantId = requireAuth(request).tenantId;
      const where: Prisma.AuditLogWhereInput = {
        // A tenant admin (or a platform admin acting in a tenant) only sees that tenant's trail.
        ...(tenantId ? { tenantId } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.entity ? { entity: query.entity } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
        ...(createdAt ? { createdAt } : {}),
      };
      const [total, logs] = await request.db.$transaction([
        request.db.auditLog.count({ where }),
        request.db.auditLog.findMany({
          where,
          include: { user: { select: { id: true, email: true, role: true } } },
          orderBy: [{ createdAt: query.order }, { id: "asc" }],
          ...toSkipTake(query),
        }),
      ]);
      return paginated(
        logs.map((log) => ({
          id: log.id,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          metadata: log.metadata,
          ipAddress: log.ipAddress,
          requestId: log.requestId,
          user: log.user,
          createdAt: log.createdAt.toISOString(),
        })),
        buildMeta(query.page, query.limit, total),
      );
    },
  );
};
