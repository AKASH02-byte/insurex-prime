import { z } from "zod";
import { PaymentMethod, PaymentStatus } from "../../generated/prisma/enums.js";
import {
  dateRangeQuerySchema,
  orderQuerySchema,
  paginationQuerySchema,
  searchQuerySchema,
} from "../../utils/pagination.js";
import { agentRefSchema } from "../customers/customers.schemas.js";
import { customerRefSchema } from "../sold-policies/sold-policies.schemas.js";

export const receiptSchema = z
  .object({
    id: z.uuid(),
    receiptNumber: z.string(),
    soldPolicy: z.object({
      id: z.uuid(),
      policyNumber: z.string(),
      policyName: z.string(),
      customer: customerRefSchema,
      agent: agentRefSchema,
    }),
    amount: z.number(),
    paymentMethod: z.enum(PaymentMethod),
    paymentStatus: z.enum(PaymentStatus),
    issuedAt: z.iso.datetime(),
  })
  .meta({ id: "Receipt" });

export const receiptIdParamsSchema = z.object({ id: z.uuid() });

export const listReceiptsQuerySchema = paginationQuerySchema
  .extend(searchQuerySchema.shape)
  .extend(orderQuerySchema.shape)
  .extend(dateRangeQuerySchema.shape)
  .extend({
    paymentMethod: z.enum(PaymentMethod).optional(),
    paymentStatus: z.enum(PaymentStatus).optional(),
    soldPolicyId: z.uuid().optional(),
    agentId: z.uuid().optional().describe("SUPER_ADMIN only; ignored for agents"),
    sortBy: z.enum(["issuedAt", "amount", "receiptNumber"]).default("issuedAt"),
  });

export const createReceiptBodySchema = z.object({
  soldPolicyId: z.uuid(),
  amount: z.number().positive().max(1e10),
  paymentMethod: z.enum(PaymentMethod),
  paymentStatus: z.enum(PaymentStatus).default("PAID"),
});
