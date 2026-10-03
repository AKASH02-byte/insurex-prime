import { keepPreviousData } from "@tanstack/react-query";
import type { CustomerListParams, SoldPolicyListParams } from "@/lib/api";

/**
 * React Query keys for the Super Admin workspace, all under ["admin"]. The agent portal
 * writes through the same backend, so these queries poll and refetch on focus: a sale
 * recorded by an agent shows up here without a manual reload.
 */
export const adminKeys = {
  all: ["admin"] as const,
  summary: ["admin", "dashboard", "summary"] as const,
  portfolioSummary: ["admin", "dashboard", "portfolio-summary"] as const,
  policyDistribution: ["admin", "dashboard", "policy-distribution"] as const,
  policySales: (interval: string, from: string) =>
    ["admin", "dashboard", "policy-sales", interval, from] as const,
  recentSales: (limit: number) => ["admin", "dashboard", "recent-sales", limit] as const,
  agentPerformance: (limit: number) => ["admin", "dashboard", "agent-performance", limit] as const,
  soldPolicies: (params: SoldPolicyListParams) => ["admin", "sold-policies", params] as const,
  soldPoliciesAll: ["admin", "sold-policies"] as const,
  customers: (params: CustomerListParams) => ["admin", "customers", params] as const,
  customersAll: ["admin", "customers"] as const,
  agents: ["admin", "agents"] as const,
};

/** How often admin tables re-poll the backend while the tab is visible. */
export const ADMIN_POLL_MS = 15_000;

export const liveQueryOptions = {
  refetchInterval: ADMIN_POLL_MS,
  refetchOnWindowFocus: true,
  placeholderData: keepPreviousData,
} as const;
