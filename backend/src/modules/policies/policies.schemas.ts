import { z } from "zod";
import { InsuranceType, PolicyStatus, PremiumFrequency } from "../../generated/prisma/enums.js";
import {
  dateRangeQuerySchema,
  orderQuerySchema,
  paginationQuerySchema,
  searchQuerySchema,
} from "../../utils/pagination.js";

const detailText = z.string().trim().max(300).default("");

export const healthDetailsSchema = z
  .object({
    kind: z.literal("HEALTH"),
    planType: z.enum(["INDIVIDUAL", "FAMILY"]),
    sumInsured: z.number().positive().max(1e12),
    hospitalizationCoverage: detailText,
    waitingPeriod: detailText,
    ageEligibility: detailText,
  })
  .meta({ id: "HealthPolicyDetails" });

export const motorDetailsSchema = z
  .object({
    kind: z.literal("MOTOR"),
    vehicleType: z.enum(["PRIVATE_CAR", "TWO_WHEELER", "COMMERCIAL_VEHICLE"]),
    coverageType: z.enum(["THIRD_PARTY", "COMPREHENSIVE", "OWN_DAMAGE"]),
    ownDamage: detailText,
    thirdPartyCoverage: detailText,
    vehicleEligibility: detailText,
  })
  .meta({ id: "MotorPolicyDetails" });

export const categoryDetailsSchema = z.discriminatedUnion("kind", [
  healthDetailsSchema,
  motorDetailsSchema,
]);
export type CategoryDetails = z.infer<typeof categoryDetailsSchema>;

export const policySchema = z
  .object({
    id: z.uuid(),
    policyCode: z.string(),
    policyName: z.string(),
    insuranceType: z.enum(InsuranceType),
    description: z.string(),
    coverageAmount: z.number(),
    premium: z.number(),
    premiumFrequency: z.enum(PremiumFrequency),
    durationMonths: z.number().int(),
    eligibility: z.string(),
    benefits: z.array(z.string()),
    terms: z.string(),
    categoryDetails: categoryDetailsSchema.nullable(),
    status: z.enum(PolicyStatus),
    policiesSold: z.number().int().nullable().describe("SUPER_ADMIN only; null for agents"),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "Policy" });

export const policyIdParamsSchema = z.object({ id: z.uuid() });

export const listPoliciesQuerySchema = paginationQuerySchema
  .extend(searchQuerySchema.shape)
  .extend(orderQuerySchema.shape)
  .extend(dateRangeQuerySchema.shape)
  .extend({
    insuranceType: z.enum(InsuranceType).optional(),
    status: z.enum(PolicyStatus).optional().describe("SUPER_ADMIN only; agents always get ACTIVE"),
    premiumFrequency: z.enum(PremiumFrequency).optional(),
    premiumMin: z.coerce.number().min(0).optional(),
    premiumMax: z.coerce.number().min(0).optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "policyName", "policyCode", "premium", "coverageAmount"])
      .default("createdAt"),
  })
  .refine(
    (query) =>
      query.premiumMin === undefined ||
      query.premiumMax === undefined ||
      query.premiumMin <= query.premiumMax,
    { message: "premiumMin must not exceed premiumMax", path: ["premiumMin"] },
  );

const policyFields = {
  policyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,30}$/, "use 3–30 letters, digits or dashes"),
  policyName: z.string().trim().min(2).max(120),
  insuranceType: z.enum(InsuranceType),
  description: z.string().trim().max(2000).default(""),
  coverageAmount: z.number().positive().max(1e12),
  premium: z.number().positive().max(1e10),
  premiumFrequency: z.enum(PremiumFrequency).default("ANNUAL"),
  durationMonths: z.number().int().min(1).max(600),
  eligibility: z.string().trim().max(1000).default(""),
  benefits: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  terms: z.string().trim().max(5000).default(""),
  categoryDetails: categoryDetailsSchema.nullable().optional(),
  status: z.enum(PolicyStatus).default("ACTIVE"),
};

const detailsMatchType = (body: {
  insuranceType?: InsuranceType | undefined;
  categoryDetails?: CategoryDetails | null | undefined;
}) =>
  !body.categoryDetails || !body.insuranceType || body.categoryDetails.kind === body.insuranceType;

export const createPolicyBodySchema = z.object(policyFields).refine(detailsMatchType, {
  message: "categoryDetails.kind must match insuranceType",
  path: ["categoryDetails"],
});

export const updatePolicyBodySchema = z
  .object({
    ...policyFields,
    description: policyFields.description.removeDefault(),
    premiumFrequency: policyFields.premiumFrequency.removeDefault(),
    eligibility: policyFields.eligibility.removeDefault(),
    benefits: policyFields.benefits.removeDefault(),
    terms: policyFields.terms.removeDefault(),
    status: policyFields.status.removeDefault(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "at least one field is required")
  .refine(detailsMatchType, {
    message: "categoryDetails.kind must match insuranceType",
    path: ["categoryDetails"],
  });

export const policyStatusBodySchema = z.object({ status: z.enum(PolicyStatus) });
