import type { Prisma } from "../generated/prisma/client.js";

/** DECIMAL columns are returned as numbers in the API (INR amounts, 2 dp). */
export const toNumber = (value: Prisma.Decimal): number => value.toNumber();

export const toNullableNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : value.toNumber();

/** DATE columns are returned as "YYYY-MM-DD". */
export const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

/** Parses "YYYY-MM-DD" as a UTC date for DATE columns. */
export const parseDateOnly = (value: string): Date =>
  new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
