import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireAuth, requireRole } from "../../middleware/role.js";
import {
  errorResponses,
  ok,
  paginated,
  paginatedSchema,
  successSchema,
} from "../../utils/response.js";
import {
  createSoldPolicyBodySchema,
  listSoldPoliciesQuerySchema,
  soldPolicyDetailSchema,
  soldPolicyIdParamsSchema,
  soldPolicySchema,
  updateSoldPolicyBodySchema,
} from "./sold-policies.schemas.js";
import {
  createSoldPolicy,
  getSoldPolicy,
  listSoldPolicies,
  updateSoldPolicy,
} from "./sold-policies.service.js";

const security = [{ bearerAuth: [] }];
const tags = ["Sold Policies"];

export const soldPolicyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "",
    {
      schema: {
        tags,
        security,
        summary: "List sold policies",
        description:
          "AGENT callers see only their own sales. Search matches policy number, customer name/code and policy name/code. Date range filters `issueDate`.",
        querystring: listSoldPoliciesQuerySchema,
        response: { 200: paginatedSchema(soldPolicySchema), ...errorResponses },
      },
    },
    async (request) => {
      const { items, meta } = await listSoldPolicies(app.db, requireAuth(request), request.query);
      return paginated(items, meta);
    },
  );

  app.get(
    "/:id",
    {
      schema: {
        tags,
        security,
        summary: "Get a sold policy with its receipts",
        params: soldPolicyIdParamsSchema,
        response: { 200: successSchema(soldPolicyDetailSchema), ...errorResponses },
      },
    },
    async (request) => ok(await getSoldPolicy(app.db, requireAuth(request), request.params.id)),
  );

  app.post(
    "",
    {
      schema: {
        tags,
        security,
        summary: "Record a policy sale",
        description:
          "The policy must be ACTIVE. AGENT callers can sell only to their own customers, at the catalog premium; the sale is always attributed to the calling agent. Expiry is computed from the policy duration. New sales start PENDING until paid.",
        body: createSoldPolicyBodySchema,
        response: { 201: successSchema(soldPolicyDetailSchema), ...errorResponses },
      },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(ok(await createSoldPolicy(app.db, requireAuth(request), request, request.body))),
  );

  app.patch(
    "/:id",
    {
      preHandler: requireRole("SUPER_ADMIN"),
      schema: {
        tags,
        security,
        summary: "Update a sold policy (SUPER_ADMIN)",
        params: soldPolicyIdParamsSchema,
        body: updateSoldPolicyBodySchema,
        response: { 200: successSchema(soldPolicyDetailSchema), ...errorResponses },
      },
    },
    async (request) => ok(await updateSoldPolicy(app.db, request, request.params.id, request.body)),
  );
};
