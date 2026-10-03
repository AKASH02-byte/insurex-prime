import { z } from "zod";
import { InsuranceType, PolicyStatus } from "../../generated/prisma/enums.js";

export const catalogPolicySchema = z
  .object({
    id: z.uuid(),
    policyCode: z.string(),
    policyName: z.string(),
    status: z.enum(PolicyStatus),
    premium: z.number().nullable().describe("Null when priced on the insurer's portal"),
    coverageAmount: z.number().nullable(),
    durationMonths: z.number().int().nullable(),
  })
  .meta({ id: "CatalogPolicy" });

export const catalogSubCategorySchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    sortOrder: z.number().int(),
    policies: z.array(catalogPolicySchema),
  })
  .meta({ id: "CatalogSubCategory" });

export const catalogCategorySchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    sortOrder: z.number().int(),
    subCategories: z.array(catalogSubCategorySchema),
    policies: z.array(catalogPolicySchema).describe("Policies directly in this category"),
  })
  .meta({ id: "CatalogCategory" });

export const catalogLineSchema = z
  .object({
    line: z.enum(InsuranceType),
    categories: z.array(catalogCategorySchema),
    policies: z.array(catalogPolicySchema).describe("Policies directly under the line"),
  })
  .meta({ id: "CatalogLine" });

export const catalogInsurerSchema = z
  .object({
    insurer: z.object({ id: z.uuid(), code: z.string(), name: z.string() }),
    businessCode: z.string(),
    lines: z.array(catalogLineSchema),
  })
  .meta({ id: "CatalogInsurer" });

export const catalogTreeSchema = z
  .object({ insurers: z.array(catalogInsurerSchema) })
  .meta({ id: "CatalogTree" });

export const catalogTreeQuerySchema = z.object({
  insurerId: z.uuid().optional(),
  line: z.enum(InsuranceType).optional(),
});

export const categorySchema = z
  .object({
    id: z.uuid(),
    insurerId: z.uuid(),
    line: z.enum(InsuranceType),
    parentId: z.uuid().nullable(),
    name: z.string(),
    sortOrder: z.number().int(),
    policyCount: z.number().int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "PolicyCategory" });

export const listCategoriesQuerySchema = z.object({
  insurerId: z.uuid().optional(),
  line: z.enum(InsuranceType).optional(),
  parentId: z.uuid().optional().describe("Only the sub-categories of this category"),
  topLevel: z.stringbool().optional().describe("true = only top-level categories"),
});

export const categoryIdParamsSchema = z.object({ id: z.uuid() });

const categoryName = z.string().trim().min(2).max(100);

export const createCategoryBodySchema = z.object({
  insurerId: z
    .uuid()
    .optional()
    .describe("Required when the tenant sells for more than one insurer"),
  line: z.enum(InsuranceType),
  parentId: z.uuid().nullable().optional().describe("Omit for a top-level category"),
  name: categoryName,
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const updateCategoryBodySchema = z
  .object({ name: categoryName, sortOrder: z.number().int().min(0).max(10_000) })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "at least one field is required");

// ─── Custom catalog supplied when a tenant is activated ───────────────────────
const customPolicySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  coverageAmount: z.number().positive().max(1e12).optional(),
  premium: z.number().positive().max(1e10).optional(),
  durationMonths: z.number().int().min(1).max(600).optional(),
  benefits: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
});

const customSubCategorySchema = z.object({
  name: categoryName,
  policies: z.array(customPolicySchema).max(200).optional(),
});

const customCategorySchema = z.object({
  name: categoryName,
  categories: z.array(customSubCategorySchema).max(50).optional(),
  policies: z.array(customPolicySchema).max(200).optional(),
});

export const customCatalogSchema = z
  .array(
    z.object({
      line: z.enum(InsuranceType),
      categories: z.array(customCategorySchema).max(50).optional(),
      policies: z.array(customPolicySchema).max(200).optional(),
    }),
  )
  .max(4)
  .describe("Lines of business, each with categories, sub-categories and policy names");
