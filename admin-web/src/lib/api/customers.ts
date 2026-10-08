import { apiRequest, apiRequestPaginated, toQuery, type ListParams } from "./client";
import type { ApiCustomer, ApiCustomerDetail, CustomerStatus, InsuranceType } from "./types";

export type CustomerInput = Partial<
  Omit<
    ApiCustomer,
    "id" | "customerCode" | "assignedAgent" | "policiesCount" | "createdAt" | "updatedAt"
  >
> & {
  /** SUPER_ADMIN only — the backend ignores it for agents. */
  assignedAgentId?: string | null;
};

export interface CustomerListParams extends ListParams {
  status?: CustomerStatus | undefined;
  agentId?: string | undefined;
  insuranceType?: InsuranceType | undefined;
  city?: string | undefined;
}

/** Agents only ever receive their own customers; the backend enforces it. */
export const customersApi = {
  list: (params?: CustomerListParams) =>
    apiRequestPaginated<ApiCustomer>("/customers", { query: toQuery(params) }),
  get: (id: string) => apiRequest<ApiCustomerDetail>(`/customers/${id}`),
  create: (input: CustomerInput & { fullName: string; phone: string }) =>
    apiRequest<ApiCustomer>("/customers", { method: "POST", body: input }),
  update: (id: string, input: CustomerInput) =>
    apiRequest<ApiCustomer>(`/customers/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) => apiRequest<{ id: string }>(`/customers/${id}`, { method: "DELETE" }),
};
