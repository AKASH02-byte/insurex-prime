import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireAgentId, requireAuth, requireRole } from "../../middleware/role.js";
import { errorResponses, ok, successSchema } from "../../utils/response.js";
import {
  agentDashboardQuerySchema,
  agentDashboardSchema,
  agentProfileSchema,
  updateAgentProfileBodySchema,
} from "./agent-portal.schemas.js";
import { getAgentDashboard, getAgentProfile, updateAgentProfile } from "./agent-portal.service.js";

const security = [{ bearerAuth: [] }];
const tags = ["Agent Portal"];

/** AGENT-only endpoints. The agent is always the authenticated caller. */
export const agentPortalRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireRole("AGENT"));

  app.get(
    "/dashboard",
    {
      schema: {
        tags,
        security,
        summary: "The signed-in agent's dashboard",
        description:
          "KPIs, sales and premium trends, Health/Motor split, recent sales and customers, and policies expiring within 30 days — all for the calling agent only.",
        querystring: agentDashboardQuerySchema,
        response: { 200: successSchema(agentDashboardSchema), ...errorResponses },
      },
    },
    async (request) =>
      ok(
        await getAgentDashboard(app.db, requireAgentId(requireAuth(request)), request.query.range),
      ),
  );

  app.get(
    "/profile",
    {
      schema: {
        tags,
        security,
        summary: "The signed-in agent's profile",
        response: { 200: successSchema(agentProfileSchema), ...errorResponses },
      },
    },
    async (request) => ok(await getAgentProfile(app.db, requireAgentId(requireAuth(request)))),
  );

  app.patch(
    "/profile",
    {
      schema: {
        tags,
        security,
        summary: "Update the signed-in agent's name, phone or address",
        description: "Email, agent code and status are managed by the Super Admin (400 if sent).",
        body: updateAgentProfileBodySchema,
        response: { 200: successSchema(agentProfileSchema), ...errorResponses },
      },
    },
    async (request) =>
      ok(
        await updateAgentProfile(
          app.db,
          request,
          requireAgentId(requireAuth(request)),
          request.body,
        ),
      ),
  );
};
