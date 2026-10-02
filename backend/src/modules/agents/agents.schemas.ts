import { z } from "zod";
import type { Agent } from "../../generated/prisma/client.js";
import { AgentStatus } from "../../generated/prisma/enums.js";
import { toDateOnly } from "../../utils/format.js";
import {
  dateRangeQuerySchema,
  orderQuerySchema,
  paginationQuerySchema,
  searchQuerySchema,
} from "../../utils/pagination.js";

export const agentSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    agentCode: z.string(),
    fullName: z.string(),
    email: z.string().describe("Account email (sign-in identifier), stored on the user account"),
    phone: z.string(),
    address: z.string().nullable(),
    joinedAt: z.string().describe("YYYY-MM-DD"),
    status: z.enum(AgentStatus),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "Agent" });

export const agentWithStatsSchema = agentSchema
  .extend({
    stats: z.object({
      customers: z.number().int(),
      policiesSold: z.number().int(),
    }),
  })
  .meta({ id: "AgentWithStats" });

export const agentListItemSchema = agentWithStatsSchema
  .extend({
    initialPassword: z
      .string()
      .nullable()
      .describe(
        "SUPER_ADMIN only. The default password (first 5 letters of first name + @ + phone) while the agent has not yet changed it; null once they have. Passwords are stored hashed, so a password the agent chose is never retrievable",
      ),
  })
  .meta({ id: "AgentListItem" });

export const agentCreatedSchema = agentWithStatsSchema
  .extend({
    temporaryPassword: z
      .string()
      .describe("Shown once. The agent must replace it on first sign-in; it is never retrievable"),
  })
  .meta({ id: "AgentCreated" });

export const temporaryPasswordSchema = z
  .object({ temporaryPassword: z.string() })
  .meta({ id: "TemporaryPassword" });

export type AgentDto = z.infer<typeof agentSchema>;
export type AgentWithUser = Agent & { user: { email: string } };

export const toAgentDto = (agent: AgentWithUser): AgentDto => ({
  id: agent.id,
  userId: agent.userId,
  agentCode: agent.agentCode,
  fullName: agent.fullName,
  email: agent.user.email,
  phone: agent.phone,
  address: agent.address,
  joinedAt: toDateOnly(agent.joinedAt),
  status: agent.status,
  createdAt: agent.createdAt.toISOString(),
  updatedAt: agent.updatedAt.toISOString(),
});

export const agentIdParamsSchema = z.object({ id: z.uuid() });

export const listAgentsQuerySchema = paginationQuerySchema
  .extend(searchQuerySchema.shape)
  .extend(orderQuerySchema.shape)
  .extend(dateRangeQuerySchema.shape)
  .extend({
    status: z.enum(AgentStatus).optional(),
    sortBy: z.enum(["createdAt", "fullName", "agentCode", "joinedAt"]).default("createdAt"),
  });

const phone = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+\d][\d\s-]*$/, "invalid phone number");

export const createAgentBodySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  phone,
  address: z.string().trim().max(500).optional(),
  agentCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/)
    .optional()
    .describe("Generated when omitted"),
  joinedAt: z.iso.date().optional().describe("YYYY-MM-DD; defaults to today"),
  status: z.enum(AgentStatus).default("ACTIVE"),
});

export const updateAgentBodySchema = createAgentBodySchema
  .omit({ status: true, email: true })
  .partial()
  .extend({
    email: z
      .email()
      .max(254)
      .transform((email) => email.toLowerCase())
      .optional()
      .describe("Changing the email changes the sign-in email and unlinks any Google sign-in"),
  })
  .refine((body) => Object.keys(body).length > 0, "at least one field is required");

export const agentStatusBodySchema = z.object({ status: z.enum(AgentStatus) });
