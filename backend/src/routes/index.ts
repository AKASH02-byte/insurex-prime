import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { healthRoutes } from "./health.js";

export const registerRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/auth" });
};
