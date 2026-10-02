import { randomInt } from "node:crypto";

// No 0/O/1/I to keep codes readable over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(prefix: string, length = 6): string {
  let suffix = "";
  for (let index = 0; index < length; index += 1) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${suffix}`;
}

const isUniqueViolation = (error: unknown) => (error as { code?: unknown }).code === "P2002";

/**
 * Runs `create` with freshly generated codes, retrying on unique-constraint
 * collisions. Callers must pre-check any other unique fields so retries only
 * cover code collisions.
 */
export async function withGeneratedCode<T>(
  generate: () => string,
  create: (code: string) => Promise<T>,
  attempts = 5,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await create(generate());
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= attempts) throw error;
    }
  }
}
