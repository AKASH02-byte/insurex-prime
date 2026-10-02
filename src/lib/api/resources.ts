import { apiRequest, apiRequestPaginated, type ListParams, type QueryValue } from "./client";
import type {
  AgentPerformanceRow,
  AgentStatus,
  ApiAgent,
  ApiCustomer,
  ApiPolicy,
  ApiReceipt,
  ApiSoldPolicy,
  CurrentUser,
  CustomerStatus,
  DashboardSummary,
  InsuranceType,
  PaymentMethod,
  PaymentStatus,
  PolicyDistributionRow,
  PolicyInput,
  PolicyPerformanceRow,
  PolicyStatus,
  PremiumFrequency,
  SalesSeries,
  SoldPolicyStatus,
} from "./types";

type Query = Record<string, QueryValue>;
const q = (params: object | undefined): Query => ({ ...(params as Query | undefined) });

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  /** Call once after Google sign-in: verifies the token and records the login. */
  verify: () => apiRequest<CurrentUser>("/auth/verify", { method: "POST" }),
  me: () => apiRequest<CurrentUser>("/auth/me"),
};

// ─── Agents ───────────────────────────────────────────────────────────────────
export interface AgentInput {
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  agentCode?: string;
  joinedAt?: string;
  status?: AgentStatus;
}

export const agentsApi = {
  list: (params?: ListParams & { status?: AgentStatus }) =>
    apiRequestPaginated<ApiAgent>("/agents", { query: q(params) }),
  get: (id: string) => apiRequest<ApiAgent>(`/agents/${id}`),
  create: (input: AgentInput) => apiRequest<ApiAgent>("/agents", { method: "POST", body: input }),
  update: (id: string, input: Partial<Omit<AgentInput, "status">>) =>
    apiRequest<ApiAgent>(`/agents/${id}`, { method: "PATCH", body: input }),
  setStatus: (id: string, status: AgentStatus) =>
    apiRequest<ApiAgent>(`/agents/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id: string) => apiRequest<{ id: string }>(`/agents/${id}`, { method: "DELETE" }),
};

// ─── Customers ────────────────────────────────────────────────────────────────
export type CustomerInput = Partial<
  Omit<
    ApiCustomer,
    "id" | "customerCode" | "assignedAgent" | "policiesCount" | "createdAt" | "updatedAt"
  >
> & { assignedAgentId?: string | null };

export const customersApi = {
  list: (
    params?: ListParams & {
      status?: CustomerStatus;
      agentId?: string;
      insuranceType?: InsuranceType;
      city?: string;
    },
  ) => apiRequestPaginated<ApiCustomer>("/customers", { query: q(params) }),
  get: (id: string) => apiRequest<ApiCustomer>(`/customers/${id}`),
  create: (input: CustomerInput & { fullName: string; phone: string }) =>
    apiRequest<ApiCustomer>("/customers", { method: "POST", body: input }),
  update: (id: string, input: CustomerInput) =>
    apiRequest<ApiCustomer>(`/customers/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) => apiRequest<{ id: string }>(`/customers/${id}`, { method: "DELETE" }),
};

// ─── Policies ─────────────────────────────────────────────────────────────────
export interface PolicyListParams extends ListParams {
  insuranceType?: InsuranceType;
  status?: PolicyStatus;
  premiumFrequency?: PremiumFrequency;
  premiumMin?: number;
  premiumMax?: number;
}

export const policiesApi = {
  list: (params?: PolicyListParams) =>
    apiRequestPaginated<ApiPolicy>("/policies", { query: q(params) }),
  get: (id: string) => apiRequest<ApiPolicy>(`/policies/${id}`),
  create: (input: PolicyInput) =>
    apiRequest<ApiPolicy>("/policies", { method: "POST", body: input }),
  update: (id: string, input: Partial<PolicyInput>) =>
    apiRequest<ApiPolicy>(`/policies/${id}`, { method: "PATCH", body: input }),
  setStatus: (id: string, status: PolicyStatus) =>
    apiRequest<ApiPolicy>(`/policies/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id: string) => apiRequest<{ id: string }>(`/policies/${id}`, { method: "DELETE" }),
};

// ─── Sold policies ────────────────────────────────────────────────────────────
export const soldPoliciesApi = {
  list: (
    params?: ListParams & {
      policyStatus?: SoldPolicyStatus;
      paymentStatus?: PaymentStatus;
      insuranceType?: InsuranceType;
      agentId?: string;
      customerId?: string;
      policyId?: string;
    },
  ) => apiRequestPaginated<ApiSoldPolicy>("/sold-policies", { query: q(params) }),
  get: (id: string) => apiRequest<ApiSoldPolicy>(`/sold-policies/${id}`),
  create: (input: {
    policyId: string;
    customerId: string;
    issueDate?: string;
    agentId?: string;
    premium?: number;
  }) => apiRequest<ApiSoldPolicy>("/sold-policies", { method: "POST", body: input }),
  update: (
    id: string,
    input: Partial<{
      policyStatus: SoldPolicyStatus;
      paymentStatus: PaymentStatus;
      issueDate: string;
      expiryDate: string;
      premium: number;
    }>,
  ) => apiRequest<ApiSoldPolicy>(`/sold-policies/${id}`, { method: "PATCH", body: input }),
};

// ─── Receipts ─────────────────────────────────────────────────────────────────
export const receiptsApi = {
  list: (
    params?: ListParams & {
      paymentMethod?: PaymentMethod;
      paymentStatus?: PaymentStatus;
      soldPolicyId?: string;
      agentId?: string;
    },
  ) => apiRequestPaginated<ApiReceipt>("/receipts", { query: q(params) }),
  get: (id: string) => apiRequest<ApiReceipt>(`/receipts/${id}`),
  create: (input: {
    soldPolicyId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
  }) => apiRequest<ApiReceipt>("/receipts", { method: "POST", body: input }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
type Range = { from?: string; to?: string };

export const dashboardApi = {
  summary: (range?: Range) =>
    apiRequest<DashboardSummary>("/dashboard/summary", { query: q(range) }),
  policySales: (
    params?: Range & { interval?: "day" | "week" | "month"; insuranceType?: InsuranceType },
  ) => apiRequest<SalesSeries>("/dashboard/policy-sales", { query: q(params) }),
  policyDistribution: (range?: Range) =>
    apiRequest<PolicyDistributionRow[]>("/dashboard/policy-distribution", { query: q(range) }),
  agentPerformance: (
    params?: Range & { limit?: number; sortBy?: "premium" | "policiesSold" | "customers" },
  ) => apiRequest<AgentPerformanceRow[]>("/dashboard/agent-performance", { query: q(params) }),
  recentSales: (limit = 10) =>
    apiRequest<ApiSoldPolicy[]>("/dashboard/recent-sales", { query: { limit } }),
};

// ─── Reports (SUPER_ADMIN) ────────────────────────────────────────────────────
export const reportsApi = {
  sales: (
    params?: Range & {
      interval?: "day" | "week" | "month";
      agentId?: string;
      insuranceType?: InsuranceType;
    },
  ) =>
    apiRequest<{
      summary: DashboardSummary;
      timeline: SalesSeries;
      byType: PolicyDistributionRow[];
      byPolicyStatus: { status: SoldPolicyStatus; count: number; premium: number }[];
      byPaymentStatus: { status: PaymentStatus; count: number; premium: number }[];
    }>("/reports/sales", { query: q(params) }),
  policies: (
    params?: Range & {
      page?: number;
      limit?: number;
      insuranceType?: InsuranceType;
      status?: PolicyStatus;
      sortBy?: "policiesSold" | "premium" | "policyName";
    },
  ) => apiRequestPaginated<PolicyPerformanceRow>("/reports/policies", { query: q(params) }),
  agents: (
    params?: Range & {
      page?: number;
      limit?: number;
      status?: AgentStatus;
      sortBy?: "premium" | "policiesSold" | "customers" | "fullName";
    },
  ) => apiRequestPaginated<AgentPerformanceRow>("/reports/agents", { query: q(params) }),
};
