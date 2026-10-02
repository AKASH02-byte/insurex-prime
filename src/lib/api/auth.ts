import { apiRequest } from "./client";
import type { CurrentUser } from "./types";

export const authApi = {
  /** Call once after Google sign-in: verifies the token and records the login. */
  verify: () => apiRequest<CurrentUser>("/auth/verify", { method: "POST" }),
  me: () => apiRequest<CurrentUser>("/auth/me"),
};

export interface AgentLoginResult {
  expiresAt: string;
  user: CurrentUser;
}

/**
 * Agent password sign-in. The session lives in an HttpOnly cookie set by the API;
 * no token is ever handed to this code.
 */
export const agentAuthApi = {
  login: (identifier: string, password: string) =>
    apiRequest<AgentLoginResult>("/auth/agent/login", {
      method: "POST",
      auth: false,
      body: { identifier, password },
    }),
  logout: () =>
    apiRequest<{ signedOut: true }>("/auth/agent/logout", { method: "POST", auth: false }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<CurrentUser>("/auth/agent/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    }),
};
