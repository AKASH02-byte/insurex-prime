import { apiRequest, apiRequestPaginated, toQuery, type ListParams } from "./client";
import type {
  ApiPolicy,
  InsuranceType,
  PolicyInput,
  PolicyStatus,
  PremiumFrequency,
} from "./types";

export interface PolicyListParams extends ListParams {
  insuranceType?: InsuranceType | undefined;
  status?: PolicyStatus | undefined;
  premiumFrequency?: PremiumFrequency | undefined;
  premiumMin?: number | undefined;
  premiumMax?: number | undefined;
}

/** Agents receive ACTIVE policies only and cannot change the catalog. */
export const policiesApi = {
  list: (params?: PolicyListParams) =>
    apiRequestPaginated<ApiPolicy>("/policies", { query: toQuery(params) }),
  get: (id: string) => apiRequest<ApiPolicy>(`/policies/${id}`),
  create: (input: PolicyInput) =>
    apiRequest<ApiPolicy>("/policies", { method: "POST", body: input }),
  update: (id: string, input: Partial<PolicyInput>) =>
    apiRequest<ApiPolicy>(`/policies/${id}`, { method: "PATCH", body: input }),
  setStatus: (id: string, status: PolicyStatus) =>
    apiRequest<ApiPolicy>(`/policies/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id: string) => apiRequest<{ id: string }>(`/policies/${id}`, { method: "DELETE" }),
};
