import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyBaseLogger, FastifyRequest } from "fastify";
import type { Env } from "../../config/env.js";
import type { Database } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { renderPasswordResetEmail } from "../../utils/email/password-reset-template.js";
import { isEmailConfigured, sendEmail } from "../../utils/email/send.js";
import { recordAudit } from "../audit-logs/audit-logs.service.js";
import { findAgentLoginUser, parseAgentIdentifier } from "./agent-login.service.js";
import { revokeUserSessions } from "./agent-session.js";
import { hashPassword } from "./password.js";

type ResetConfig = Pick<
  Env,
  | "PASSWORD_RESET_SECRET"
  | "PASSWORD_RESET_TTL_MINUTES"
  | "RESEND_API_KEY"
  | "RESEND_FROM_EMAIL"
  | "RESEND_FROM_NAME"
  | "FRONTEND_URL"
>;

export const isPasswordResetConfigured = (config: ResetConfig) =>
  Boolean(config.PASSWORD_RESET_SECRET) && isEmailConfigured(config) && config.FRONTEND_URL.length > 0;

// No 0/O/1/l/I so the password can be read out or retyped without guessing.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

const sign = (secret: string, purpose: string, userId: string, expires: number, hash: string) =>
  createHmac("sha256", secret).update(`${purpose}|${userId}|${expires}|${hash}`).digest();

/**
 * The temporary password is derived from the signed link data, so the email can show it
 * before anything changes: the account keeps its current password until the link is
 * confirmed. e.g. "Hq7v-Kt3m-Pz9a".
 */
function deriveTemporaryPassword(secret: string, userId: string, expires: number, hash: string) {
  for (let counter = 0; ; counter += 1) {
    const bytes = sign(secret, `temp:${counter}`, userId, expires, hash);
    let raw = "";
    for (let index = 0; index < 12; index += 1) raw += ALPHABET[bytes[index]! % ALPHABET.length];
    if (/[A-Za-z]/.test(raw) && /\d/.test(raw)) return raw.match(/.{4}/g)!.join("-");
  }
}

/** Bound to the current password hash, so a used (or superseded) link stops working. */
function createResetToken(secret: string, userId: string, hash: string, ttlMinutes: number) {
  const expires = Math.floor(Date.now() / 1000) + ttlMinutes * 60;
  const signature = sign(secret, "reset", userId, expires, hash).toString("base64url");
  return {
    token: `${userId}.${expires}.${signature}`,
    expires,
    temporaryPassword: deriveTemporaryPassword(secret, userId, expires, hash),
  };
}

const invalidLink = () =>
  new AppError(400, "BAD_REQUEST", "This reset link is invalid or has expired. Request a new one.");

/** Emails a reset link and temporary password. Never reveals whether the account exists. */
export async function requestPasswordReset(
  db: Database,
  config: ResetConfig,
  logger: FastifyBaseLogger,
  rawIdentifier: string,
) {
  const secret = config.PASSWORD_RESET_SECRET;
  if (!secret || !isPasswordResetConfigured(config)) {
    throw new AppError(
      503,
      "SERVICE_UNAVAILABLE",
      "Password reset by email is not available. Contact your administrator.",
    );
  }
  const user = await findAgentLoginUser(db, parseAgentIdentifier(rawIdentifier));
  if (!user || !user.passwordHash || user.status !== "ACTIVE") return;
  if (user.agent && user.agent.status !== "ACTIVE") return;

  const { token, temporaryPassword } = createResetToken(
    secret,
    user.id,
    user.passwordHash,
    config.PASSWORD_RESET_TTL_MINUTES,
  );
  const webBaseUrl = config.FRONTEND_URL[0]!.replace(/\/+$/, "");
  const email = renderPasswordResetEmail({
    name: (user.agent?.fullName ?? "").split(/\s+/)[0] || undefined,
    agencyName: user.tenant?.name,
    temporaryPassword,
    // The role only picks which portal the reset page and sign-in open in; the token decides the rest.
    resetUrl: `${webBaseUrl}/reset-password?token=${encodeURIComponent(token)}&role=${
      user.role === "AGENT" ? "agent" : "admin"
    }`,
    webBaseUrl,
    expiresInMinutes: config.PASSWORD_RESET_TTL_MINUTES,
  });
  try {
    await sendEmail(config, { to: user.email, ...email });
  } catch (error) {
    // The caller always gets the same answer, so a delivery failure is only logged.
    logger.error({ err: error, userId: user.id }, "password reset email failed");
  }
}

/** Applies the reset: the account now has the temporary password and must change it. */
export async function confirmPasswordReset(
  db: Database,
  config: ResetConfig,
  request: FastifyRequest,
  token: string,
) {
  const secret = config.PASSWORD_RESET_SECRET;
  if (!secret) throw invalidLink();
  const [userId, expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  if (!userId || !signature || !Number.isInteger(expires) || expires * 1000 < Date.now()) {
    throw invalidLink();
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, passwordHash: true },
  });
  if (!user?.passwordHash || user.status !== "ACTIVE") throw invalidLink();

  const expected = sign(secret, "reset", user.id, expires, user.passwordHash);
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw invalidLink();

  const passwordHash = await hashPassword(
    deriveTemporaryPassword(secret, user.id, expires, user.passwordHash),
  );
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date() },
    });
    await revokeUserSessions(tx, user.id);
    await recordAudit(tx, request, {
      action: "auth.password_reset",
      entity: "User",
      entityId: user.id,
      userId: user.id,
      metadata: { method: "EMAIL_LINK" },
    });
  });
}
