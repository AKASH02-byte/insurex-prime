import { z } from "zod";
import { logoDataUrl } from "../platform/platform.schemas.js";

export const tenantProfileSchema = z
  .object({
    name: z.string(),
    legalName: z.string(),
    logoUrl: z.string().nullable(),
    contactEmail: z.string().nullable(),
    contactPhone: z.string().nullable(),
    address: z.string().nullable(),
  })
  .meta({ id: "TenantProfile" });

/** What a tenant admin may edit themselves; names and codes stay with the platform team. */
export const updateTenantProfileBodySchema = z
  .object({
    logoUrl: logoDataUrl.nullable(),
    contactPhone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{7,20}$/, "must be a valid phone number")
      .nullable(),
    address: z.string().trim().min(5).max(500).nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "at least one field is required");
