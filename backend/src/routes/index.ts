import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { healthRoutes } from "./health.js";

export const registerRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(healthRoutes);
};
