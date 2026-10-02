import type { Database } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export const userInclude = { agent: { include: { user: { select: { email: true } } } } } as const;

function isUniqueViolation(error: unknown) {
  return (error as { code?: unknown }).code === "P2002";
}

/**
 * Maps a verified Firebase identity to an InsureX user.
 *
 * - Known Firebase UID → that user.
 * - Email of a pre-provisioned user (e.g. an agent created by a Super Admin) that has
 *   never signed in → the account is linked to this Firebase UID.
 * - Email listed in SUPER_ADMIN_EMAILS → a SUPER_ADMIN user is created.
 * - Anyone else → rejected. Accounts are never self-provisioned.
 */
export async function resolveUserForIdentity(
  db: Database,
  superAdminEmails: string[],
  identity: { uid: string; email: string },
) {
  let user = await db.user.findUnique({
    where: { firebaseUid: identity.uid },
    include: userInclude,
  });

  if (!user) {
    const byEmail = await db.user.findUnique({
      where: { email: identity.email },
      include: userInclude,
    });

    if (byEmail) {
      if (byEmail.firebaseUid && byEmail.firebaseUid !== identity.uid) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "This email is linked to a different sign-in account. Contact your administrator.",
        );
      }
      user = await db.user.update({
        where: { id: byEmail.id },
        data: { firebaseUid: identity.uid },
        include: userInclude,
      });
    } else if (superAdminEmails.includes(identity.email)) {
      try {
        user = await db.user.create({
          data: { email: identity.email, firebaseUid: identity.uid, role: "SUPER_ADMIN" },
          include: userInclude,
        });
      } catch (error) {
        // Concurrent first requests: another request created the user.
        if (!isUniqueViolation(error)) throw error;
        user = await db.user.findUnique({
          where: { firebaseUid: identity.uid },
          include: userInclude,
        });
      }
    }
  }

  if (!user) {
    throw new AppError(
      403,
      "ACCOUNT_NOT_PROVISIONED",
      "This account has not been set up for InsureX. Contact your administrator.",
    );
  }
  assertCanSignIn(user);
  return user;
}

type UserWithAgent = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Rejects disabled users and agents without an ACTIVE agent profile. */
export function assertCanSignIn(user: UserWithAgent) {
  if (user.status !== "ACTIVE") {
    throw new AppError(403, "ACCOUNT_DISABLED", "This account has been disabled.");
  }
  if (user.role === "AGENT") {
    if (!user.agent) {
      throw new AppError(
        403,
        "ACCOUNT_NOT_PROVISIONED",
        "No agent profile exists for this account.",
      );
    }
    if (user.agent.status !== "ACTIVE") {
      throw new AppError(403, "ACCOUNT_DISABLED", "This agent account is not active.");
    }
  }
}

export async function getCurrentUser(db: Database, userId: string) {
  return db.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude });
}
