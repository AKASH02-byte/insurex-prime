import { apiRequest, apiRequestPaginated, toQuery, type ListParams } from "./client";
import type {
  ApiSoldPolicy,
  ApiSoldPolicyDetail,
  InsuranceType,
  PaymentMethod,
  PaymentStatus,
  SoldPolicyQuote,
  SoldPolicyStatus,
} from "./types";

export interface SoldPolicyListParams extends ListParams {
  policyStatus?: SoldPolicyStatus | undefined;
  paymentStatus?: PaymentStatus | undefined;
  insuranceType?: InsuranceType | undefined;
  agentId?: string | undefined;
  customerId?: string | undefined;
  policyId?: string | undefined;
}

export interface SalePolicyInput {
  policyId: string;
  customerId: string;
  issueDate?: string | undefined;
  /** Premium collected at the point of sale: a receipt is generated with the sale. */
  paymentMethod?: PaymentMethod | undefined;
  /** SUPER_ADMIN only. */
  agentId?: string | undefined;
  /** Admins may override the catalog premium; agents may set it only when the catalog has none. */
  premium?: number | undefined;
  /** Required when the policy has no catalog term; admins may override it otherwise. */
  expiryDate?: string | undefined;
  /** The number issued on the insurer's own portal. */
  insurerPolicyNumber?: string | undefined;
}

/**
 * Agents only see their own sales. Premium, expiry, policy number and the selling
 * agent are always decided by the backend.
 */
export const soldPoliciesApi = {
  list: (params?: SoldPolicyListParams) =>
    apiRequestPaginated<ApiSoldPolicy>("/sold-policies", { query: toQuery(params) }),
  get: (id: string) => apiRequest<ApiSoldPolicyDetail>(`/sold-policies/${id}`),
  quote: (params: { policyId: string; customerId: string; issueDate?: string }) =>
    apiRequest<SoldPolicyQuote>("/sold-policies/quote", { query: toQuery(params) }),
  create: (input: SalePolicyInput) =>
    apiRequest<ApiSoldPolicyDetail>("/sold-policies", { method: "POST", body: input }),
  update: (
    id: string,
    input: Partial<{
      policyStatus: SoldPolicyStatus;
      paymentStatus: PaymentStatus;
      issueDate: string;
      expiryDate: string;
      premium: number;
    }>,
  ) => apiRequest<ApiSoldPolicyDetail>(`/sold-policies/${id}`, { method: "PATCH", body: input }),
};
