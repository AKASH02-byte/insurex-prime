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

const sessionLifetimeSeconds = 60 * 60 * 24 * 30;

function getSessionConfig() {
  const password = process.env.AUTH_SESSION_SECRET;
  if (!password || password.length < 32) return null;

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
    const apiKey = process.env.FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY;
    const config = getSessionConfig();

    if (!apiKey || !config) {
      throw new Error("Google sign-in is not configured on this server.");
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: data.idToken }),
      },
    );

    if (!response.ok) {
      throw new Error("Google sign-in could not be verified. Please try again.");
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

    await updateSession<AdminSessionData>(config, {
      uid: user.localId,
      email,
      role: "super_admin",
    });

    return { email };
  });

export const endAdminSession = createServerFn({ method: "POST" }).handler(async () => {
  const config = getSessionConfig();
  if (config) await clearSession(config);
  return { success: true };
});
