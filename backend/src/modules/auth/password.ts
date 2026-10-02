import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { z } from "zod";

/**
 * Agent passwords are hashed with scrypt (node:crypto, no native add-ons).
 * Stored format: `scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>` so parameters can be
 * raised later without invalidating existing hashes.
 */
const PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
const SALT_BYTES = 16;
// 128 * N * r bytes are needed; leave headroom above Node's 32 MiB default.
const MAX_MEMORY = 64 * 1024 * 1024;
// Refuse absurd parameters from a tampered hash instead of exhausting memory.
const MAX_N = 2 ** 17;

const derive = (password: string, salt: Buffer, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, { ...PARAMS, maxmem: MAX_MEMORY });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const options = { N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEMORY * 2 };
  if (![options.N, options.r, options.p].every(Number.isInteger) || options.N > MAX_N) return false;

  const expected = Buffer.from(hash, "base64");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await derive(password, Buffer.from(salt, "base64"), options);
  return timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;

/**
 * A hash to verify against when no account matches, so a sign-in for an unknown
 * agent takes as long as one with a wrong password.
 */
export const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

// No 0/O/1/l/I so temporary passwords can be read out over the phone.
const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** e.g. "Hq7v-Kt3m-Pz9a": 12 random characters, always with letters and digits. */
export function generateTemporaryPassword(): string {
  for (;;) {
    let raw = "";
    for (let index = 0; index < 12; index += 1)
      raw += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
    if (/[A-Za-z]/.test(raw) && /\d/.test(raw)) return raw.match(/.{4}/g)!.join("-");
  }
}

export const newPasswordSchema = z
  .string()
  .min(8, "must be at least 8 characters")
  .max(128, "must be at most 128 characters")
  .regex(/[A-Za-z]/, "must contain a letter")
  .regex(/\d/, "must contain a number")
  .refine((value) => value.trim() === value, "must not start or end with spaces");
