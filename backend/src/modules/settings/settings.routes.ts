import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireAuth, requireRole } from "../../middleware/role.js";
import { errorResponses, ok, successSchema } from "../../utils/response.js";
import {
  settingsHealthSchema,
  settingsResponseSchema,
  updateSettingsBodySchema,
} from "./settings.schemas.js";
import { getEffectiveSettings, getSettingsHealth, updateSettings } from "./settings.service.js";

const security = [{ bearerAuth: [] }];
const tags = ["Settings"];

/** Every endpoint is SUPER_ADMIN only (role is read from the database, never the request). */
export const settingsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireRole("SUPER_ADMIN"));

  app.get(
    "",
    {
      schema: {
        tags,
        security,
        summary: "Read system settings (SUPER_ADMIN)",
        description: "Returns every known setting, falling back to defaults for unsaved keys.",
        response: { 200: successSchema(settingsResponseSchema), ...errorResponses },
      },
    },
    async () => ok((await getEffectiveSettings(app.db)).response),
  );

  app.patch(
    "",
    {
      schema: {
        tags,
        security,
        summary: "Update system settings (SUPER_ADMIN)",
        description:
          "Body: `{ settings: { <key>: <value> } }`. Unknown keys and invalid values are rejected. Writes a `settings.update` audit entry.",
        body: updateSettingsBodySchema,
        response: { 200: successSchema(settingsResponseSchema), ...errorResponses },
      },
    },
    async (request) =>
      ok(await updateSettings(app.db, requireAuth(request), request, request.body.settings)),
  );

  app.get(
    "/health",
    {
      schema: {
        tags,
        security,
        summary: "Configuration and security status (SUPER_ADMIN)",
        description:
          "Reports whether integrations are configured and the active security configuration. Never returns secret values.",
        response: { 200: successSchema(settingsHealthSchema), ...errorResponses },
      },
    },
    async (request) => ok(await getSettingsHealth(app.db, app.config, requireAuth(request))),
  );
};
