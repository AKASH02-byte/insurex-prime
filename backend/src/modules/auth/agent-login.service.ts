import type { Database } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { userInclude } from "./auth.service.js";

/** What an agent typed to sign in: their agent code or their account email. */
export type AgentIdentifier =
  { kind: "agentCode"; value: string } | { kind: "email"; value: string };

export function parseAgentIdentifier(raw: string): AgentIdentifier {
  const value = raw.trim();
  return value.includes("@")
    ? { kind: "email", value: value.toLowerCase() }
    : { kind: "agentCode", value: value.toUpperCase() };
}

/** The agent's user account (with agent profile), or null when nothing matches. */
export async function findAgentLoginUser(db: Database, identifier: AgentIdentifier) {
  const user =
    identifier.kind === "email"
      ? await db.user.findUnique({ where: { email: identifier.value }, include: userInclude })
      : (
          await db.agent.findUnique({
            where: { agentCode: identifier.value },
            select: { user: { include: userInclude } },
          })
        )?.user;
  // Only AGENT accounts can use password sign-in; Super Admins use Google.
  if (!user || user.role !== "AGENT" || !user.agent) return null;
  return user;
}

/** In-memory limit on failed sign-in attempts per key (client + identifier, or user). */
export class LoginAttemptLimiter {
  private readonly failures = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly maxFailures = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  assertAllowed(key: string) {
    const entry = this.failures.get(key);
    if (!entry || entry.resetAt <= Date.now()) return;
    if (entry.count >= this.maxFailures) {
      const minutes = Math.ceil((entry.resetAt - Date.now()) / 60_000);
      throw new AppError(
        429,
        "RATE_LIMITED",
        `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      );
    }
  }

  recordFailure(key: string) {
    const now = Date.now();
    if (this.failures.size > 10_000) {
      for (const [stored, entry] of this.failures) {
        if (entry.resetAt <= now) this.failures.delete(stored);
      }
    }
    const entry = this.failures.get(key);
    if (!entry || entry.resetAt <= now) {
      this.failures.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
  }

  reset(key: string) {
    this.failures.delete(key);
  }
}
