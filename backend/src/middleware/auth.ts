import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { TokenVerificationError, type TokenVerifier } from "../config/firebase.js";
import type { Role } from "../generated/prisma/enums.js";
import { hashSessionToken, readSessionCookie } from "../modules/auth/agent-session.js";
import {
  assertCanSignIn,
  resolveUserForIdentity,
  userInclude,
} from "../modules/auth/auth.service.js";
import { AppError, forbidden, unauthenticated } from "../utils/errors.js";

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  /** Set for AGENT users; null for SUPER_ADMIN. */
  agentId: string | null;
  /** Set when signed in with an agent password session (cookie); null for Firebase tokens. */
  sessionId: string | null;
  /** The agent signed in with a temporary password and must choose a new one. */
  mustChangePassword: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    tokenVerifier: TokenVerifier;
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    auth: AuthContext | null;
  }
  interface FastifyContextConfig {
    /** Reachable while the agent still has to replace a temporary password. */
    allowPendingPasswordChange?: boolean;
  }
}

const MAX_TOKEN_LENGTH = 8192;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Avoid a write per request just to track activity.
const LAST_SEEN_RESOLUTION_MS = 5 * 60 * 1000;

function extractBearerToken(header: string): string {
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match?.[1]) throw unauthenticated("Authorization header must be 'Bearer <token>'.");
  if (match[1].length > MAX_TOKEN_LENGTH)
    throw new AppError(401, "INVALID_TOKEN", "Invalid token.");
  return match[1];
}

/**
 * Cookie-authenticated writes must come from an allowed frontend origin (CSRF defence
 * on top of SameSite). Browsers always send Origin on cross-origin writes; requests
 * without one are not browser cross-site requests.
 */
export function assertTrustedOrigin(app: FastifyInstance, request: FastifyRequest) {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.origin;
  if (!origin) return;
  const allowed = app.config.FRONTEND_URL;
  if (allowed.includes("*") || allowed.includes(origin)) return;
  throw forbidden("This request was blocked because it came from an untrusted site.");
}

/**
 * Identifies the caller from either
 *  - `Authorization: Bearer <Firebase ID token>` (Super Admins, Google sign-in), or
 *  - the agent session cookie set by `POST /auth/agent/login`.
 * The user, role and status are always loaded from the database. Nothing about identity
 * or role is taken from the request body or query.
 */
export const authPlugin = fp(
  async (app: FastifyInstance, options: { tokenVerifier: TokenVerifier }) => {
    app.decorate("tokenVerifier", options.tokenVerifier);
    app.decorateRequest("auth", null);

    async function authenticateSession(request: FastifyRequest, token: string) {
      assertTrustedOrigin(app, request);
      const session = await app.db.agentSession.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        include: { user: { include: userInclude } },
      });
      if (!session || session.revokedAt) {
        throw new AppError(401, "INVALID_TOKEN", "Your session has ended. Please sign in again.");
      }
      if (session.expiresAt.getTime() <= Date.now()) {
        throw new AppError(401, "TOKEN_EXPIRED", "Your session has expired. Please sign in again.");
      }
      const { user } = session;
      assertCanSignIn(user);

      if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_RESOLUTION_MS) {
        await app.db.agentSession.update({
          where: { id: session.id },
          data: { lastSeenAt: new Date() },
        });
      }

      request.auth = {
        userId: user.id,
        email: user.email,
        role: user.role,
        agentId: user.agent?.id ?? null,
        sessionId: session.id,
        mustChangePassword: user.mustChangePassword,
      };

      if (user.mustChangePassword && !request.routeOptions.config.allowPendingPasswordChange) {
        throw new AppError(
          403,
          "PASSWORD_CHANGE_REQUIRED",
          "Please change your temporary password to continue.",
        );
      }
    }

    async function authenticateFirebase(request: FastifyRequest, token: string) {
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
        sessionId: null,
        mustChangePassword: false,
      };
    }

    app.decorate("authenticate", async (request: FastifyRequest) => {
      const header = request.headers.authorization;
      if (header) return authenticateFirebase(request, extractBearerToken(header));

      const sessionToken = readSessionCookie(request);
      if (sessionToken) return authenticateSession(request, sessionToken);

      throw unauthenticated();
    });
  },
  { name: "insurex-auth" },
);
