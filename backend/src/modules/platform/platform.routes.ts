import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireRole } from "../../middleware/role.js";
import {
  errorResponses,
  ok,
  paginated,
  paginatedSchema,
  successSchema,
} from "../../utils/response.js";
import {
  activateTenantBodySchema,
  adminPasswordSchema,
  insurerAddedSchema,
  tenantInsurerInputSchema,
  tenantInsurerParamsSchema,
  tenantSchema as tenantDtoSchema,
  updateTenantInsurerBodySchema,
  createInsurerBodySchema,
  insurerIdParamsSchema,
  insurerSchema,
  listTenantsQuerySchema,
  tenantActivatedSchema,
  tenantIdParamsSchema,
  tenantSchema,
  updateInsurerBodySchema,
  updateTenantBodySchema,
} from "./platform.schemas.js";
import {
  activateTenant,
  addTenantInsurer,
  updateTenantInsurer,
  createInsurer,
  getTenant,
  listInsurers,
  listTenants,
  resetTenantAdminPassword,
  setTenantStatus,
  updateInsurer,
  updateTenant,
} from "./platform.service.js";

const security = [{ bearerAuth: [] }];

/** Platform operator endpoints. SUPER_ADMIN only; they never touch a tenant's own data. */
export const platformRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireRole("SUPER_ADMIN"));

  // ─── Insurers ───────────────────────────────────────────────────────────────
  const insurerTags = ["Platform: Insurers"];

  app.get(
    "/insurers",
    {
      schema: {
        tags: insurerTags,
        security,
        summary: "List insurance companies (SUPER_ADMIN)",
        response: { 200: successSchema(z.array(insurerSchema)), ...errorResponses },
      },
    },
    async () => ok(await listInsurers(app.db)),
  );

  app.post(
    "/insurers",
    {
      schema: {
        tags: insurerTags,
        security,
        summary: "Add an insurance company (SUPER_ADMIN)",
        description:
          "Use the codes TATA_AIA or TATA_AIG to get the built-in starter catalog at tenant activation.",
        body: createInsurerBodySchema,
        response: { 201: successSchema(insurerSchema), ...errorResponses },
      },
    },
    async (request, reply) =>
      reply.code(201).send(ok(await createInsurer(app.db, request, request.body))),
  );

  app.patch(
    "/insurers/:id",
    {
      schema: {
        tags: insurerTags,
        security,
        summary: "Rename or deactivate an insurer (SUPER_ADMIN)",
        params: insurerIdParamsSchema,
        body: updateInsurerBodySchema,
        response: { 200: successSchema(insurerSchema), ...errorResponses },
      },
    },
    async (request) => ok(await updateInsurer(app.db, request, request.params.id, request.body)),
  );

  // ─── Tenants ────────────────────────────────────────────────────────────────
  const tenantTags = ["Platform: Tenants"];

  app.get(
    "/tenants",
    {
      schema: {
        tags: tenantTags,
        security,
        summary: "List tenants (SUPER_ADMIN)",
        querystring: listTenantsQuerySchema,
        response: { 200: paginatedSchema(tenantSchema), ...errorResponses },
      },
    },
    async (request) => {
      const { items, meta } = await listTenants(app.db, request.query);
      return paginated(items, meta);
    },
  );

  app.post(
    "/tenants",
    {
      schema: {
        tags: tenantTags,
        security,
        summary: "Activate a tenant (SUPER_ADMIN)",
        description:
          "Creates the tenant, its single admin account and its starting catalog in one transaction. The admin's temporary password is returned once.",
        body: activateTenantBodySchema,
        response: { 201: successSchema(tenantActivatedSchema), ...errorResponses },
      },
    },
    async (request, reply) =>
      reply.code(201).send(ok(await activateTenant(app.db, request, request.body))),
  );

  app.post(
    "/tenants/:id/insurers",
    {
      schema: {
        tags: tenantTags,
        security,
        summary: "Add an insurer to a tenant (SUPER_ADMIN)",
        description:
          "Registers the tenant's business and licence codes with another insurer and, optionally, loads that insurer's starting catalog.",
        params: tenantIdParamsSchema,
        body: tenantInsurerInputSchema,
        response: { 201: successSchema(insurerAddedSchema), ...errorResponses },
      },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(ok(await addTenantInsurer(app.db, request, request.params.id, request.body))),
  );

  app.patch(
    "/tenants/:id/insurers/:insurerId",
    {
      schema: {
        tags: tenantTags,
        security,
        summary: "Update a tenant's business and licence codes for one insurer (SUPER_ADMIN)",
        params: tenantInsurerParamsSchema,
        body: updateTenantInsurerBodySchema,
        response: { 200: successSchema(tenantDtoSchema), ...errorResponses },
      },
    },
    async (request) =>
      ok(
        await updateTenantInsurer(
          app.db,
          request,
          request.params.id,
          request.params.insurerId,
          request.body,
        ),
      ),
  );

  app.get(
    "/tenants/:id",
    {
      schema: {
        tags: tenantTags,
        security,
        summary: "Get a tenant (SUPER_ADMIN)",
        params: tenantIdParamsSchema,
        response: { 200: successSchema(tenantSchema), ...errorResponses },
      },
    },
    async (request) => ok(await getTenant(app.db, request.params.id)),
  );

  app.patch(
    "/tenants/:id",
    {
      schema: {
        tags: tenantTags,
        security,
        summary: "Update a tenant's names (SUPER_ADMIN)",
        params: tenantIdParamsSchema,
        body: updateTenantBodySchema,
        response: { 200: successSchema(tenantSchema), ...errorResponses },
      },
    },
    async (request) => ok(await updateTenant(app.db, request, request.params.id, request.body)),
  );

  app.post(
    "/tenants/:id/suspend",
    {
      schema: {
        tags: tenantTags,
        security,
        summary: "Suspend a tenant (SUPER_ADMIN)",
        description: "Everyone in the tenant is blocked on their next request. Data is kept.",
        params: tenantIdParamsSchema,
        response: { 200: successSchema(tenantSchema), ...errorResponses },
      },
    },
    async (request) => ok(await setTenantStatus(app.db, request, request.params.id, "SUSPENDED")),
  );

  app.post(
    "/tenants/:id/activate",
    {
      schema: {
        tags: tenantTags,
        security,
        summary: "Reactivate a suspended tenant (SUPER_ADMIN)",
        params: tenantIdParamsSchema,
        response: { 200: successSchema(tenantSchema), ...errorResponses },
      },
    },
    async (request) => ok(await setTenantStatus(app.db, request, request.params.id, "ACTIVE")),
  );

  app.post(
    "/tenants/:id/admin/reset-password",
    {
      schema: {
        tags: tenantTags,
        security,
        summary: "Issue a new temporary password to the tenant admin (SUPER_ADMIN)",
        params: tenantIdParamsSchema,
        response: { 200: successSchema(adminPasswordSchema), ...errorResponses },
      },
    },
    async (request) => ok(await resetTenantAdminPassword(app.db, request, request.params.id)),
  );
};
