import { z } from "zod";
import type { PaginationMeta } from "./pagination.js";

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  meta: PaginationMeta;
}

export const ok = <T>(data: T): SuccessResponse<T> => ({ success: true, data });

export const paginated = <T>(data: T[], meta: PaginationMeta): PaginatedResponse<T> => ({
  success: true,
  data,
  meta,
});

// ─── OpenAPI / serializer schemas ─────────────────────────────────────────────
export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const successSchema = <T extends z.ZodType>(data: T) =>
  z.object({ success: z.literal(true), data });

export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({ success: z.literal(true), data: z.array(item), meta: paginationMetaSchema });

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      requestId: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .meta({ id: "ErrorResponse" });

/** Standard error responses, merged into each route's `response` schema. */
export const errorResponses = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  429: errorResponseSchema,
  500: errorResponseSchema,
};
