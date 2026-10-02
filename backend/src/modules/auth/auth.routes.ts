import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { Role, UserStatus } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middleware/role.js";
import { errorResponses, ok, successSchema } from "../../utils/response.js";
import { agentSchema, toAgentDto } from "../agents/agents.schemas.js";
import { recordAudit } from "../audit-logs/audit-logs.service.js";
import { getCurrentUser } from "./auth.service.js";

export const meSchema = z
  .object({
    id: z.uuid(),
    email: z.string(),
    role: z.enum(Role),
    status: z.enum(UserStatus),
    lastLoginAt: z.iso.datetime().nullable(),
    mustChangePassword: z
      .boolean()
      .describe("Agent signed in with a temporary password and must change it first"),
    agent: agentSchema.nullable(),
  })
  .meta({ id: "CurrentUser" });

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export const toMeDto = (user: CurrentUser): z.infer<typeof meSchema> => ({
  id: user.id,
  email: user.email,
  role: user.role,
  status: user.status,
  lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  mustChangePassword: user.mustChangePassword,
  agent: user.agent ? toAgentDto(user.agent) : null,
});

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/verify",
    {
      schema: {
        tags: ["Auth"],
        summary: "Verify the Firebase ID token and start a session",
        description:
          "Call once after Google sign-in. Verifies the token, links/provisions the account where allowed, records the login, and returns the user's server-side role.",
        security: [{ bearerAuth: [] }],
        response: { 200: successSchema(meSchema), ...errorResponses },
      },
    },
    async (request) => {
      const auth = requireAuth(request);
      await app.db.user.update({
        where: { id: auth.userId },
        data: { lastLoginAt: new Date() },
      });
      await recordAudit(app.db, request, {
        action: "auth.login",
        entity: "User",
        entityId: auth.userId,
        metadata: { role: auth.role },
      });
      return ok(toMeDto(await getCurrentUser(app.db, auth.userId)));
    },
  );

  app.get(
    "/me",
    {
      config: { allowPendingPasswordChange: true },
      schema: {
        tags: ["Auth"],
        summary: "Current user, role and agent profile",
        security: [{ bearerAuth: [] }],
        response: { 200: successSchema(meSchema), ...errorResponses },
      },
    },
    async (request) => ok(toMeDto(await getCurrentUser(app.db, requireAuth(request).userId))),
  );
};
