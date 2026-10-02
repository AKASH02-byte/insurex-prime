import { z } from "zod";
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
  agentIdParamsSchema,
  agentStatusBodySchema,
  agentWithStatsSchema,
  createAgentBodySchema,
  listAgentsQuerySchema,
  updateAgentBodySchema,
} from "./agents.schemas.js";
import {
  createAgent,
  deleteAgent,
  getAgent,
  listAgents,
  setAgentStatus,
  updateAgent,
} from "./agents.service.js";

const adminOnly = requireRole("SUPER_ADMIN");
const security = [{ bearerAuth: [] }];
const tags = ["Agents"];

export const agentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "",
    {
      preHandler: adminOnly,
      schema: {
        tags,
        security,
        summary: "List agents (SUPER_ADMIN)",
        description:
          "Search matches name, agent code, phone and email. Date range filters `joinedAt`.",
        querystring: listAgentsQuerySchema,
        response: { 200: paginatedSchema(agentWithStatsSchema), ...errorResponses },
      },
    },
    async (request) => {
      const { items, meta } = await listAgents(app.db, request.query);
      return paginated(items, meta);
    },
  );

  app.get(
    "/:id",
    {
      schema: {
        tags,
        security,
        summary: "Get an agent (SUPER_ADMIN, or the agent themself)",
        params: agentIdParamsSchema,
        response: { 200: successSchema(agentWithStatsSchema), ...errorResponses },
      },
    },
    async (request) => ok(await getAgent(app.db, requireAuth(request), request.params.id)),
  );

  app.post(
    "",
    {
      preHandler: adminOnly,
      schema: {
        tags,
        security,
        summary: "Create an agent (SUPER_ADMIN)",
        description:
          "Creates the agent profile and an AGENT user for `email`. The agent signs in with the Google account for that email; the account is linked on first sign-in.",
        body: createAgentBodySchema,
        response: { 201: successSchema(agentWithStatsSchema), ...errorResponses },
      },
    },
    async (request, reply) =>
      reply.code(201).send(ok(await createAgent(app.db, request, request.body))),
  );

  app.patch(
    "/:id",
    {
      preHandler: adminOnly,
      schema: {
        tags,
        security,
        summary: "Update an agent (SUPER_ADMIN)",
        params: agentIdParamsSchema,
        body: updateAgentBodySchema,
        response: { 200: successSchema(agentWithStatsSchema), ...errorResponses },
      },
    },
    async (request) => ok(await updateAgent(app.db, request, request.params.id, request.body)),
  );

  app.patch(
    "/:id/status",
    {
      preHandler: adminOnly,
      schema: {
        tags,
        security,
        summary: "Change agent status (SUPER_ADMIN)",
        description: "Non-ACTIVE agents can no longer sign in to the API.",
        params: agentIdParamsSchema,
        body: agentStatusBodySchema,
        response: { 200: successSchema(agentWithStatsSchema), ...errorResponses },
      },
    },
    async (request) =>
      ok(await setAgentStatus(app.db, request, request.params.id, request.body.status)),
  );

  app.delete(
    "/:id",
    {
      preHandler: adminOnly,
      schema: {
        tags,
        security,
        summary: "Delete an agent (SUPER_ADMIN)",
        description: "Returns 409 if the agent has customers or sold policies.",
        params: agentIdParamsSchema,
        response: { 200: successSchema(z.object({ id: z.uuid() })), ...errorResponses },
      },
    },
    async (request) => {
      await deleteAgent(app.db, request, request.params.id);
      return ok({ id: request.params.id });
    },
  );
};
