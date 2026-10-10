import type { FastifyRequest } from "fastify";
import type { Role } from "../generated/prisma/enums.js";
import { AppError, forbidden, unauthenticated } from "../utils/errors.js";
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

/** Admin of the tenant being served: a tenant admin, or a platform admin acting inside one. */
export const isAdmin = (auth: AuthContext) =>
  auth.role === "SUPER_ADMIN" || auth.role === "TENANT_ADMIN";

/** preHandler for tenant-level admin endpoints. */
export const tenantAdminOnly = requireRole("SUPER_ADMIN", "TENANT_ADMIN");

/** The tenant this request acts in, or 400 if none was chosen. */
export function requireTenantId(auth: AuthContext): string {
  if (!auth.tenantId) {
    throw new AppError(
      400,
      "TENANT_REQUIRED",
      "Choose a tenant first (send the X-Tenant-Id header).",
    );
  }
  return auth.tenantId;
}

/** The caller's agent id, or 403 if the caller is not an agent. */
export function requireAgentId(auth: AuthContext): string {
  if (auth.role !== "AGENT" || !auth.agentId) throw forbidden();
  return auth.agentId;
}
