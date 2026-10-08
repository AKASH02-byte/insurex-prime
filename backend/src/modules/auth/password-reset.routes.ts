import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { assertTrustedOrigin } from "../../middleware/auth.js";
import { errorResponses, ok, successSchema } from "../../utils/response.js";
import { LoginAttemptLimiter } from "./agent-login.service.js";
import { confirmPasswordReset, requestPasswordReset } from "./password-reset.service.js";

const requestBodySchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your agent code, phone number or email.")
    .max(254)
    .describe("Agent code, registered phone number, or account email"),
});

const confirmBodySchema = z.object({ token: z.string().trim().min(10).max(500) });

/** Forgot-password: email a signed link plus a temporary password, applied on confirmation. */
export const passwordResetRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every request counts: three emails per client and identifier in 15 minutes.
  const requestLimiter = new LoginAttemptLimiter(3);
  const confirmLimiter = new LoginAttemptLimiter(10);

  app.post(
    "/request",
    {
      schema: {
        tags: ["Auth"],
        summary: "Email a password-reset link and temporary password",
        description:
          "Always answers 200 for a well-formed request, whether or not an account matches, so it cannot be used to discover accounts. Returns 503 when email or PASSWORD_RESET_SECRET is not configured. Nothing changes on the account until the emailed link is confirmed. Three requests per client and identifier in 15 minutes (429).",
        body: requestBodySchema,
        response: { 200: successSchema(z.object({ requested: z.literal(true) })), ...errorResponses },
      },
    },
    async (request) => {
      assertTrustedOrigin(app, request);
      const key = `${request.ip}|${request.body.identifier.toLowerCase()}`;
      requestLimiter.assertAllowed(key);
      requestLimiter.recordFailure(key);
      await requestPasswordReset(app.db, app.config, request.log, request.body.identifier);
      return ok({ requested: true as const });
    },
  );

  app.post(
    "/confirm",
    {
      schema: {
        tags: ["Auth"],
        summary: "Confirm a reset link: the account gets the emailed temporary password",
        description:
          "The link is single-use (it is bound to the current password) and expires after PASSWORD_RESET_TTL_MINUTES. Ends all sessions and forces a password change at the next sign-in.",
        body: confirmBodySchema,
        response: { 200: successSchema(z.object({ reset: z.literal(true) })), ...errorResponses },
      },
    },
    async (request) => {
      assertTrustedOrigin(app, request);
      const key = request.ip;
      confirmLimiter.assertAllowed(key);
      try {
        await confirmPasswordReset(app.db, app.config, request, request.body.token);
      } catch (error) {
        confirmLimiter.recordFailure(key);
        throw error;
      }
      return ok({ reset: true as const });
    },
  );
};
