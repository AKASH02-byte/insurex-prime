import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { isDatabaseReachable } from "../config/database.js";

const healthSchema = z.object({
  success: z.boolean(),
  data: z.object({
    status: z.enum(["ok", "degraded"]),
    database: z.enum(["up", "down"]),
    uptimeSeconds: z.number(),
    timestamp: z.string(),
  }),
});

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Service and database health",
        description: "Public endpoint. Returns 503 when the database is unreachable.",
        response: { 200: healthSchema, 503: healthSchema },
      },
    },
    async (_request, reply) => {
      const databaseUp = await isDatabaseReachable(app.db);
      const body = {
        success: databaseUp,
        data: {
          status: databaseUp ? ("ok" as const) : ("degraded" as const),
          database: databaseUp ? ("up" as const) : ("down" as const),
          uptimeSeconds: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
        },
      };
      return reply.code(databaseUp ? 200 : 503).send(body);
    },
  );
};
