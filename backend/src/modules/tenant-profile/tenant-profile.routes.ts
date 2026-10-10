import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireAuth, requireRole, requireTenantId } from "../../middleware/role.js";
import { errorResponses, ok, successSchema } from "../../utils/response.js";
import { changedFields, recordAudit } from "../audit-logs/audit-logs.service.js";
import { tenantProfileSchema, updateTenantProfileBodySchema } from "./tenant-profile.schemas.js";

const security = [{ bearerAuth: [] }];
const tags = ["Tenant profile"];

const select = {
  name: true,
  legalName: true,
  logoUrl: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
} as const;

/** The signed-in agency's own profile. TENANT_ADMIN only; the tenant always comes from the session. */
export const tenantProfileRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireRole("TENANT_ADMIN"));

  app.get(
    "",
    {
      schema: {
        tags,
        security,
        summary: "Read the agency profile (TENANT_ADMIN)",
        response: { 200: successSchema(tenantProfileSchema), ...errorResponses },
      },
    },
    async (request) =>
      ok(
        await app.db.tenant.findUniqueOrThrow({
          where: { id: requireTenantId(requireAuth(request)) },
          select,
        }),
      ),
  );

  app.patch(
    "",
    {
      schema: {
        tags,
        security,
        summary: "Update the agency logo, phone and address (TENANT_ADMIN)",
        description:
          "Only `logoUrl`, `contactPhone` and `address` can be changed; send null to clear one.",
        body: updateTenantProfileBodySchema,
        response: { 200: successSchema(tenantProfileSchema), ...errorResponses },
      },
    },
    async (request) => {
      const tenantId = requireTenantId(requireAuth(request));
      const body = request.body;
      return ok(
        await app.db.$transaction(async (tx) => {
          const tenant = await tx.tenant.update({
            where: { id: tenantId },
            data: {
              ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
              ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone }),
              ...(body.address !== undefined && { address: body.address }),
            },
            select,
          });
          await recordAudit(tx, request, {
            action: "tenant.profile_update",
            entity: "Tenant",
            entityId: tenantId,
            metadata: { fields: changedFields(body) },
          });
          return tenant;
        }),
      );
    },
  );
};
