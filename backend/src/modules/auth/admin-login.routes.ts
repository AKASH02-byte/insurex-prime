import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { assertTrustedOrigin } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";
import { errorResponses, ok, successSchema } from "../../utils/response.js";
import { recordAudit } from "../audit-logs/audit-logs.service.js";
import { LoginAttemptLimiter } from "./agent-login.service.js";
import { createAgentSession, setSessionCookie } from "./agent-session.js";
import { meSchema, toMeDto } from "./auth.routes.js";
import { assertCanSignIn, getCurrentUser, userInclude } from "./auth.service.js";

const loginBodySchema = z.object({
  identifier: z.string().trim().min(1, "Enter your admin ID.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
});

const sessionResponseSchema = z
  .object({ expiresAt: z.iso.datetime(), user: meSchema })
  .meta({ id: "AdminSession" });

/** Constant-time comparison that does not leak the length of either value. */
const safeEqual = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

/** "9090 909 090" and "9090909090" are the same phone-style ID. */
const normalizeId = (id: string) => {
  const value = id.trim().toLowerCase();
  return /^\+?[\d\s-]{7,20}$/.test(value) ? value.replace(/\D/g, "") : value;
};

/**
 * Super Admin sign-in with the fixed credentials from ADMIN_LOGIN_IDS / ADMIN_PASSWORD.
 * Uses the same HttpOnly session cookie as agents; log out with POST /auth/agent/logout.
 */
export const adminLoginRoutes: FastifyPluginAsyncZod = async (app) => {
  const limiter = new LoginAttemptLimiter();

  app.post(
    "/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Super Admin sign-in with the configured admin ID + password",
        description:
          "Sets an HttpOnly session cookie. Five failures in 15 minutes lock the ID for that client (429). Returns 404 when ADMIN_PASSWORD is not configured.",
        body: loginBodySchema,
        response: { 200: successSchema(sessionResponseSchema), ...errorResponses },
      },
    },
    async (request, reply) => {
      assertTrustedOrigin(app, request);
      const { ADMIN_LOGIN_IDS: ids, ADMIN_PASSWORD: adminPassword } = app.config;
      const email = ids.find((id) => id.includes("@"));
      if (!adminPassword || !email) {
        throw new AppError(404, "NOT_FOUND", "Admin password sign-in is not configured.");
      }

      const identifier = normalizeId(request.body.identifier);
      const limiterKey = `admin|${request.ip}|${identifier}`;
      limiter.assertAllowed(limiterKey);

      // Evaluate both checks so timing does not reveal which one failed.
      const idOk = ids.some((id) => safeEqual(normalizeId(id), identifier));
      const passwordOk = safeEqual(adminPassword, request.body.password);
      if (!idOk || !passwordOk) {
        limiter.recordFailure(limiterKey);
        throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect admin ID or password.");
      }
      limiter.reset(limiterKey);

      const user =
        (await app.db.user.findUnique({ where: { email }, include: userInclude })) ??
        (await app.db.user.create({
          data: { email, role: "SUPER_ADMIN" },
          include: userInclude,
        }));
      if (user.role !== "SUPER_ADMIN") {
        throw new AppError(403, "FORBIDDEN", "This account is not a Super Admin.");
      }
      assertCanSignIn(user);

      const session = await createAgentSession(
        app.db,
        request,
        user.id,
        app.config.AGENT_SESSION_TTL_HOURS,
      );
      await app.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await recordAudit(app.db, request, {
        action: "auth.login",
        entity: "User",
        entityId: user.id,
        userId: user.id,
        metadata: { role: "SUPER_ADMIN", method: "PASSWORD" },
      });

      setSessionCookie(reply, app.config, session.token);
      return ok({
        expiresAt: session.expiresAt.toISOString(),
        user: toMeDto(await getCurrentUser(app.db, user.id)),
      });
    },
  );
};
