import { z } from "zod";
import { badRequest } from "./errors.js";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const searchQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
});

export const orderQuerySchema = z.object({
  order: z.enum(["asc", "desc"]).default("desc"),
});

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const dateParam = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "must be an ISO date (YYYY-MM-DD)");

export const dateRangeQuerySchema = z.object({
  from: dateParam.optional().describe("Inclusive start date (YYYY-MM-DD or ISO datetime)"),
  to: dateParam.optional().describe("Inclusive end date (YYYY-MM-DD or ISO datetime)"),
});

export function toSkipTake({ page, limit }: { page: number; limit: number }) {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/**
 * Converts `from`/`to` query values into a Prisma date filter. A date-only `to`
 * includes that whole day (UTC).
 */
export function toDateFilter(range: { from?: string | undefined; to?: string | undefined }) {
  if (!range.from && !range.to) return undefined;
  const filter: { gte?: Date; lt?: Date; lte?: Date } = {};
  if (range.from) filter.gte = new Date(range.from);
  if (range.to) {
    const end = new Date(range.to);
    if (dateOnly.test(range.to)) {
      end.setUTCDate(end.getUTCDate() + 1);
      filter.lt = end;
    } else {
      filter.lte = end;
    }
  }
  if (filter.gte && (filter.lt ?? filter.lte) && filter.gte > (filter.lt ?? filter.lte)!) {
    throw badRequest("`from` must be before `to`.");
  }
  return filter;
}
