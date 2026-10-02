import { apiRequest, apiRequestPaginated, toQuery, type ListParams } from "./client";
import type { AgentStatus, ApiAgent } from "./types";

export interface AgentInput {
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  agentCode?: string;
  joinedAt?: string;
  status?: AgentStatus;
}

/** Agent management (SUPER_ADMIN). */
export const agentsApi = {
  list: (params?: ListParams & { status?: AgentStatus }) =>
    apiRequestPaginated<ApiAgent>("/agents", { query: toQuery(params) }),
  get: (id: string) => apiRequest<ApiAgent>(`/agents/${id}`),
  /** The response carries the agent's temporary password — show it once, never store it. */
  create: (input: AgentInput) =>
    apiRequest<ApiAgent & { temporaryPassword: string }>("/agents", {
      method: "POST",
      body: input,
    }),
  update: (id: string, input: Partial<Omit<AgentInput, "status">>) =>
    apiRequest<ApiAgent>(`/agents/${id}`, { method: "PATCH", body: input }),
  setStatus: (id: string, status: AgentStatus) =>
    apiRequest<ApiAgent>(`/agents/${id}/status`, { method: "PATCH", body: { status } }),
  resetPassword: (id: string) =>
    apiRequest<{ temporaryPassword: string }>(`/agents/${id}/reset-password`, {
      method: "POST",
    }),
  remove: (id: string) => apiRequest<{ id: string }>(`/agents/${id}`, { method: "DELETE" }),
};
