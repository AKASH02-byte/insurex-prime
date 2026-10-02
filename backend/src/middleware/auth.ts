import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { TokenVerificationError, type TokenVerifier } from "../config/firebase.js";
import type { Role } from "../generated/prisma/enums.js";
import { resolveUserForIdentity } from "../modules/auth/auth.service.js";
import { AppError, unauthenticated } from "../utils/errors.js";

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  /** Set for AGENT users; null for SUPER_ADMIN. */
  agentId: string | null;
}

declare module "fastify" {
  interface FastifyInstance {
    tokenVerifier: TokenVerifier;
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

const MAX_TOKEN_LENGTH = 8192;

function extractBearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (!header) throw unauthenticated("Missing Authorization header.");
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match?.[1])
    throw unauthenticated("Authorization header must be 'Bearer <Firebase ID token>'.");
  if (match[1].length > MAX_TOKEN_LENGTH)
    throw new AppError(401, "INVALID_TOKEN", "Invalid token.");
  return match[1];
}

/**
 * Verifies the Firebase ID token, then loads the user and role from the database.
 * Nothing about identity or role is taken from the request body or query.
 */
export const authPlugin = fp(
  async (app: FastifyInstance, options: { tokenVerifier: TokenVerifier }) => {
    app.decorate("tokenVerifier", options.tokenVerifier);
    app.decorateRequest("auth", null);

    app.decorate("authenticate", async (request: FastifyRequest) => {
      const token = extractBearerToken(request);

      let identity;
      try {
        identity = await app.tokenVerifier.verifyIdToken(token);
      } catch (error) {
        if (error instanceof TokenVerificationError) {
          throw error.reason === "expired"
            ? new AppError(401, "TOKEN_EXPIRED", "Your session has expired. Please sign in again.")
            : new AppError(401, "INVALID_TOKEN", "Invalid or revoked token. Please sign in again.");
        }
        // Never log the token itself.
        request.log.error({ err: error }, "Firebase token verification unavailable");
        throw new AppError(
          503,
          "SERVICE_UNAVAILABLE",
          "Authentication is temporarily unavailable.",
        );
      }

      if (!identity.email || !identity.emailVerified) {
        throw new AppError(403, "FORBIDDEN", "A verified email address is required.");
      }

      const user = await resolveUserForIdentity(app.db, app.config.SUPER_ADMIN_EMAILS, {
        uid: identity.uid,
        email: identity.email,
      });

      request.auth = {
        userId: user.id,
        email: user.email,
        role: user.role,
        agentId: user.agent?.id ?? null,
      };
    });
  },
  { name: "insurex-auth" },
);
