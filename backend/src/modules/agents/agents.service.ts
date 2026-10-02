import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import type { Database } from "../../config/database.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { AgentStatus } from "../../generated/prisma/enums.js";
import type { AuthContext } from "../../middleware/auth.js";
import { isSuperAdmin } from "../../middleware/role.js";
import { withGeneratedCode, randomCode } from "../../utils/codes.js";
import { conflict, notFound } from "../../utils/errors.js";
import { parseDateOnly } from "../../utils/format.js";
import { buildMeta, toDateFilter, toSkipTake } from "../../utils/pagination.js";
import { containsInsensitive } from "../../utils/search.js";
import { changedFields, recordAudit } from "../audit-logs/audit-logs.service.js";
import { revokeUserSessions } from "../auth/agent-session.js";
import { generateDefaultAgentPassword, hashPassword, normalizePhone } from "../auth/password.js";
import {
  toAgentDto,
  type AgentWithUser,
  type createAgentBodySchema,
  type listAgentsQuerySchema,
  type updateAgentBodySchema,
} from "./agents.schemas.js";

const agentInclude = {
  user: { select: { email: true, mustChangePassword: true } },
  _count: { select: { customers: true, soldPolicies: true } },
} as const;

type AgentWithCounts = AgentWithUser & { _count: { customers: number; soldPolicies: number } };

const toAgentWithStats = (agent: AgentWithCounts) => ({
  ...toAgentDto(agent),
  stats: { customers: agent._count.customers, policiesSold: agent._count.soldPolicies },
});

export async function listAgents(db: Database, query: z.infer<typeof listAgentsQuerySchema>) {
  const where: Prisma.AgentWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(toDateFilter(query) ? { joinedAt: toDateFilter(query) } : {}),
    ...(query.search
      ? {
          OR: [
            { fullName: containsInsensitive(query.search) },
            { agentCode: containsInsensitive(query.search) },
            { phone: containsInsensitive(query.search) },
            { user: { email: containsInsensitive(query.search) } },
          ],
        }
      : {}),
  };
  const [total, agents] = await db.$transaction([
    db.agent.count({ where }),
    db.agent.findMany({
      where,
      include: agentInclude,
      orderBy: [{ [query.sortBy]: query.order }, { id: "asc" }],
      ...toSkipTake(query),
    }),
  ]);
  const items = agents.map((agent) => ({
    ...toAgentWithStats(agent),
    // Only an unchanged default password is known; once the agent picks their own it is hash-only.
    initialPassword: agent.user.mustChangePassword
      ? generateDefaultAgentPassword(agent.fullName, agent.phone)
      : null,
  }));
  return { items, meta: buildMeta(query.page, query.limit, total) };
}

/** Super Admins can read any agent; agents can read only themselves. */
export async function getAgent(db: Database, auth: AuthContext, id: string) {
  if (!isSuperAdmin(auth) && auth.agentId !== id) throw notFound("Agent");
  const agent = await db.agent.findUnique({ where: { id }, include: agentInclude });
  if (!agent) throw notFound("Agent");
  return toAgentWithStats(agent);
}

async function assertEmailAvailable(db: Database, email: string, exceptUserId?: string) {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== exceptUserId) {
    throw conflict("A user with this email already exists.");
  }
}

export async function createAgent(
  db: Database,
  request: FastifyRequest,
  body: z.infer<typeof createAgentBodySchema>,
) {
  await assertEmailAvailable(db, body.email);
  if (body.agentCode && (await db.agent.findUnique({ where: { agentCode: body.agentCode } }))) {
    throw conflict(`Agent code ${body.agentCode} is already in use.`);
  }

  // Phone numbers double as a login ID, so they must identify exactly one agent.
  const phone = normalizePhone(body.phone);
  if (await db.agent.findFirst({ where: { phone }, select: { id: true } })) {
    throw conflict("An agent with this phone number already exists.");
  }

  // The Super Admin hands this to the agent; only its hash is stored.
  const temporaryPassword = generateDefaultAgentPassword(body.fullName, phone);
  const passwordHash = await hashPassword(temporaryPassword);

  const agent = await withGeneratedCode(
    () => body.agentCode ?? randomCode("AGT"),
    (agentCode) =>
      db.$transaction(async (tx) => {
        const created = await tx.agent.create({
          data: {
            agentCode,
            fullName: body.fullName,
            phone,
            address: body.address ?? null,
            status: body.status,
            ...(body.joinedAt ? { joinedAt: parseDateOnly(body.joinedAt) } : {}),
            // Signs in with agent code, phone or email + the default password, then picks their own.
            user: {
              create: { email: body.email, role: "AGENT", passwordHash, mustChangePassword: true },
            },
          },
          include: agentInclude,
        });
        await recordAudit(tx, request, {
          action: "agent.create",
          entity: "Agent",
          entityId: created.id,
          metadata: { agentCode: created.agentCode },
        });
        return created;
      }),
    body.agentCode ? 1 : 5,
  );
  return { ...toAgentWithStats(agent), temporaryPassword };
}

/** Resets to the default password and signs the agent out everywhere. */
export async function resetAgentPassword(db: Database, request: FastifyRequest, id: string) {
  const agent = await db.agent.findUnique({
    where: { id },
    select: { userId: true, fullName: true, phone: true },
  });
  if (!agent) throw notFound("Agent");

  const temporaryPassword = generateDefaultAgentPassword(agent.fullName, agent.phone);
  const passwordHash = await hashPassword(temporaryPassword);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: agent.userId },
      data: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date() },
    });
    await revokeUserSessions(tx, agent.userId);
    await recordAudit(tx, request, {
      action: "agent.password_reset",
      entity: "Agent",
      entityId: id,
    });
  });
  return { temporaryPassword };
}

export async function updateAgent(
  db: Database,
  request: FastifyRequest,
  id: string,
  body: z.infer<typeof updateAgentBodySchema>,
) {
  const existing = await db.agent.findUnique({ where: { id }, include: { user: true } });
  if (!existing) throw notFound("Agent");

  const emailChanged = body.email !== undefined && body.email !== existing.user.email;
  if (emailChanged) await assertEmailAvailable(db, body.email!, existing.userId);
  if (body.agentCode && body.agentCode !== existing.agentCode) {
    if (await db.agent.findUnique({ where: { agentCode: body.agentCode } })) {
      throw conflict(`Agent code ${body.agentCode} is already in use.`);
    }
  }

  const phone = body.phone === undefined ? undefined : normalizePhone(body.phone);
  if (phone !== undefined && phone !== existing.phone) {
    if (await db.agent.findFirst({ where: { phone, NOT: { id } }, select: { id: true } })) {
      throw conflict("An agent with this phone number already exists.");
    }
  }

  // While the agent is still on the default password, keep it in step with their name/phone.
  const identityChanged =
    (body.fullName !== undefined && body.fullName !== existing.fullName) ||
    (phone !== undefined && phone !== existing.phone);
  const rehash = identityChanged && existing.user.mustChangePassword;
  const newDefaultHash = rehash
    ? await hashPassword(
        generateDefaultAgentPassword(body.fullName ?? existing.fullName, phone ?? existing.phone),
      )
    : undefined;

  const agent = await db.$transaction(async (tx) => {
    if (newDefaultHash) {
      await tx.user.update({
        where: { id: existing.userId },
        data: { passwordHash: newDefaultHash },
      });
      await revokeUserSessions(tx, existing.userId);
    }
    const updated = await tx.agent.update({
      where: { id },
      data: {
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.agentCode !== undefined ? { agentCode: body.agentCode } : {}),
        ...(body.joinedAt !== undefined ? { joinedAt: parseDateOnly(body.joinedAt) } : {}),
        // A new email must be linked again on the agent's next Google sign-in.
        ...(emailChanged ? { user: { update: { email: body.email!, firebaseUid: null } } } : {}),
      },
      include: agentInclude,
    });
    await recordAudit(tx, request, {
      action: "agent.update",
      entity: "Agent",
      entityId: id,
      metadata: { fields: changedFields(body) },
    });
    return updated;
  });
  return toAgentWithStats(agent);
}

export async function setAgentStatus(
  db: Database,
  request: FastifyRequest,
  id: string,
  status: AgentStatus,
) {
  if (!(await db.agent.findUnique({ where: { id }, select: { id: true } }))) {
    throw notFound("Agent");
  }
  const agent = await db.$transaction(async (tx) => {
    const updated = await tx.agent.update({
      where: { id },
      data: { status },
      include: agentInclude,
    });
    // Suspended or inactive agents are blocked on every request anyway; end their sessions too.
    if (status !== "ACTIVE") await revokeUserSessions(tx, updated.userId);
    await recordAudit(tx, request, {
      action: "agent.status",
      entity: "Agent",
      entityId: id,
      metadata: { status },
    });
    return updated;
  });
  return toAgentWithStats(agent);
}

/** Agents with customers or sales history cannot be deleted; deactivate them instead. */
export async function deleteAgent(db: Database, request: FastifyRequest, id: string) {
  const agent = await db.agent.findUnique({
    where: { id },
    include: { _count: { select: { customers: true, soldPolicies: true } } },
  });
  if (!agent) throw notFound("Agent");
  if (agent._count.customers > 0 || agent._count.soldPolicies > 0) {
    throw conflict(
      `Agent has ${agent._count.customers} customers and ${agent._count.soldPolicies} sold policies. Reassign them or set the agent INACTIVE instead.`,
    );
  }
  await db.$transaction(async (tx) => {
    await tx.agent.delete({ where: { id } });
    await tx.user.delete({ where: { id: agent.userId } });
    await recordAudit(tx, request, {
      action: "agent.delete",
      entity: "Agent",
      entityId: id,
      metadata: { agentCode: agent.agentCode },
    });
  });
}
