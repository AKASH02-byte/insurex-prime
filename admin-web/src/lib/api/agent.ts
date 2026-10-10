import { apiRequest } from "./client";
import type { AgentDashboard, AgentDashboardRange, AgentProfile } from "./types";

export interface AgentProfileInput {
  fullName?: string;
  phone?: string;
  address?: string | null;
}

/** The signed-in agent's own workspace. The backend derives the agent from the session. */
export const agentApi = {
  dashboard: (range: AgentDashboardRange = "30D") =>
    apiRequest<AgentDashboard>("/agent/dashboard", { query: { range } }),
  profile: () => apiRequest<AgentProfile>("/agent/profile"),
  updateProfile: (input: AgentProfileInput) =>
    apiRequest<AgentProfile>("/agent/profile", { method: "PATCH", body: input }),
};
