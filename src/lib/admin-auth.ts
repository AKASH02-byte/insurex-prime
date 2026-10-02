import { createServerFn } from "@tanstack/react-start";
import { clearSession, getSession, updateSession } from "@tanstack/react-start/server";
import { z } from "zod";

interface AdminSessionData {
  uid: string;
  email: string;
  role: "super_admin";
}

interface FirebaseAccountLookup {
  users?: Array<{
    localId?: string;
    email?: string;
    emailVerified?: boolean;
  }>;
}

interface FirebaseLookupError {
  error?: { message?: string };
}

const sessionLifetimeSeconds = 60 * 60 * 24 * 30;
const minSessionSecretLength = 32;

const serverNotConfiguredMessage = "Google sign-in is not configured on this server.";

function getFirebaseApiKey() {
  return process.env.FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY;
}

// Presence and length only — never log the values themselves.
function logAuthEnvDiagnostics(reason: string) {
  const secret = process.env.AUTH_SESSION_SECRET;
  console.error(`[admin-auth] ${reason}`, {
    hasFirebaseApiKey: Boolean(process.env.FIREBASE_API_KEY),
    hasViteFirebaseApiKeyFallback: Boolean(process.env.VITE_FIREBASE_API_KEY),
    hasAuthSessionSecret: Boolean(secret),
    authSessionSecretLength: secret?.length ?? 0,
    authSessionSecretMinLength: minSessionSecretLength,
    hasAuthAdminEmails: getAllowedAdminEmails().length > 0,
  });
}

function getSessionConfig() {
  const password = process.env.AUTH_SESSION_SECRET;
  if (!password || password.length < minSessionSecretLength) return null;

  return {
    name: "insurex_admin_session",
    password,
    maxAge: sessionLifetimeSeconds,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function getAllowedAdminEmails() {
  return (process.env.AUTH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAuthorizedAdminEmail(email: string) {
  const allowedEmails = getAllowedAdminEmails();
  return allowedEmails.length === 0 || allowedEmails.includes(email);
}

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const config = getSessionConfig();
  if (!config) return null;

  try {
    const session = await getSession<AdminSessionData>(config);
    const email = session.data.email?.toLowerCase();
    if (session.data.role !== "super_admin" || !email || !isAuthorizedAdminEmail(email)) {
      return null;
    }
    return { email };
  } catch {
    return null;
  }
});

export const exchangeFirebaseIdentity = createServerFn({ method: "POST" })
  .validator(z.object({ idToken: z.string().min(1) }))
  .handler(async ({ data }) => {
    const apiKey = getFirebaseApiKey();
    const config = getSessionConfig();

    if (!apiKey || !config) {
      logAuthEnvDiagnostics("Missing or invalid server auth environment variables.");
      throw new Error(serverNotConfiguredMessage);
    }

    let response: Response;
    try {
      response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken: data.idToken }),
        },
      );
    } catch (error) {
      console.error("[admin-auth] Firebase identity lookup request failed.", error);
      throw new Error("Google sign-in could not be verified. Please try again.");
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as FirebaseLookupError;
      const reason = body.error?.message ?? "";
      // A rejected API key (invalid, or restricted to browser referrers) is a server
      // configuration problem, not a bad token from the user.
      if (response.status === 403 || /API key|API_KEY/i.test(reason)) {
        logAuthEnvDiagnostics(
          `Firebase rejected the server API key (status ${response.status}: ${reason.slice(0, 120)}).`,
        );
        throw new Error(serverNotConfiguredMessage);
      }
      console.warn(
        `[admin-auth] Firebase ID token rejected (status ${response.status}: ${reason}).`,
      );
      throw new Error("Your Google sign-in is invalid or has expired. Please sign in again.");
    }

    const account = (await response.json()) as FirebaseAccountLookup;
    const user = account.users?.[0];
    const email = user?.email?.trim().toLowerCase();

    if (!user?.localId || !email || user.emailVerified !== true) {
      throw new Error("A verified Google account is required.");
    }
    if (!isAuthorizedAdminEmail(email)) {
      throw new Error("This Google account is not authorized for Super Admin access.");
    }

    try {
      await updateSession<AdminSessionData>(config, {
        uid: user.localId,
        email,
        role: "super_admin",
      });
    } catch (error) {
      console.error("[admin-auth] Failed to create admin session.", error);
      throw new Error(
        "Signed in with Google, but your session could not be created. Please try again.",
      );
    }

    return { email };
  });

export const endAdminSession = createServerFn({ method: "POST" }).handler(async () => {
  const config = getSessionConfig();
  if (config) await clearSession(config);
  return { success: true };
});
