import { apiRequest } from "./client";
import type { CurrentUser } from "./types";

export const authApi = {
  me: () => apiRequest<CurrentUser>("/auth/me"),
};

/** Super Admin password sign-in; the session is an HttpOnly cookie set by the API. */
export const adminAuthApi = {
  login: (identifier: string, password: string) =>
    apiRequest<AgentLoginResult>("/auth/admin/login", {
      method: "POST",
      auth: false,
      body: { identifier, password },
    }),
};

/** Forgot password: an emailed link plus temporary password, applied once the link is confirmed. */
export const passwordResetApi = {
  /** Always succeeds for a well-formed request, whether or not an account matches. */
  request: (identifier: string) =>
    apiRequest<{ requested: true }>("/auth/password-reset/request", {
      method: "POST",
      auth: false,
      body: { identifier },
    }),
  confirm: (token: string) =>
    apiRequest<{ reset: true }>("/auth/password-reset/confirm", {
      method: "POST",
      auth: false,
      body: { token },
    }),
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
