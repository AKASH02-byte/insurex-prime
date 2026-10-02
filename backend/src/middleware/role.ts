import type { FastifyRequest } from "fastify";
import type { Role } from "../generated/prisma/enums.js";
import { forbidden, unauthenticated } from "../utils/errors.js";
import type { AuthContext } from "./auth.js";

/** Returns the authenticated caller or throws 401. */
export function requireAuth(request: FastifyRequest): AuthContext {
  if (!request.auth) throw unauthenticated();
  return request.auth;
}

/** preHandler that allows only the given roles (role always comes from the database). */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest) => {
    const auth = requireAuth(request);
    if (!roles.includes(auth.role)) throw forbidden();
  };
}

export const isSuperAdmin = (auth: AuthContext) => auth.role === "SUPER_ADMIN";

/** The caller's agent id, or 403 if the caller is not an agent. */
export function requireAgentId(auth: AuthContext): string {
  if (auth.role !== "AGENT" || !auth.agentId) throw forbidden();
  return auth.agentId;
}
