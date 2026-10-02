import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Env } from "./env.js";

export interface VerifiedIdentity {
  uid: string;
  /** Lowercased email from the token, if any. */
  email: string | null;
  emailVerified: boolean;
}

/** Abstraction over Firebase so tests can supply a fake verifier. */
export interface TokenVerifier {
  verifyIdToken(token: string): Promise<VerifiedIdentity>;
}

export type TokenRejectionReason = "expired" | "revoked" | "invalid";

/** The token itself was rejected (as opposed to Firebase being unreachable). */
export class TokenVerificationError extends Error {
  constructor(public readonly reason: TokenRejectionReason) {
    super(`Firebase ID token rejected: ${reason}`);
    this.name = "TokenVerificationError";
  }
}

const APP_NAME = "insurex-backend";

type FirebaseEnv = Pick<
  Env,
  "FIREBASE_PROJECT_ID" | "FIREBASE_CLIENT_EMAIL" | "FIREBASE_PRIVATE_KEY"
>;

/** Server-only Firebase Admin initialization. Never import this from frontend code. */
export function createFirebaseTokenVerifier(env: FirebaseEnv): TokenVerifier {
  const hasServiceAccount = Boolean(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);

  const app: App =
    getApps().find((existing) => existing.name === APP_NAME) ??
    initializeApp(
      hasServiceAccount
        ? {
            projectId: env.FIREBASE_PROJECT_ID,
            credential: cert({
              projectId: env.FIREBASE_PROJECT_ID,
              clientEmail: env.FIREBASE_CLIENT_EMAIL!,
              privateKey: env.FIREBASE_PRIVATE_KEY!,
            }),
          }
        : // Verifying ID tokens only needs the project ID and Google's public keys.
          { projectId: env.FIREBASE_PROJECT_ID },
      APP_NAME,
    );

  const auth = getAuth(app);

  return {
    async verifyIdToken(token) {
      try {
        // Revocation checks call the Firebase Auth API, which requires a service account.
        const decoded = await auth.verifyIdToken(token, hasServiceAccount);
        return {
          uid: decoded.uid,
          email: decoded.email?.toLowerCase() ?? null,
          emailVerified: decoded.email_verified === true,
        };
      } catch (error) {
        const code = (error as { code?: unknown }).code;
        if (code === "auth/id-token-expired") throw new TokenVerificationError("expired");
        if (code === "auth/id-token-revoked" || code === "auth/user-disabled") {
          throw new TokenVerificationError("revoked");
        }
        if (
          typeof code === "string" &&
          code.startsWith("auth/") &&
          code !== "auth/internal-error"
        ) {
          throw new TokenVerificationError("invalid");
        }
        // Infrastructure failure (e.g. Google public keys unreachable).
        throw error;
      }
    },
  };
}
