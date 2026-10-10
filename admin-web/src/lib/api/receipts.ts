import { apiRequest, apiRequestPaginated, toQuery, type ListParams } from "./client";
import type { ApiReceipt, PaymentMethod, PaymentStatus } from "./types";

export interface ReceiptListParams extends ListParams {
  paymentMethod?: PaymentMethod | undefined;
  paymentStatus?: PaymentStatus | undefined;
  soldPolicyId?: string | undefined;
  agentId?: string | undefined;
}

/** Agents only see receipts for their own sales. */
export const receiptsApi = {
  list: (params?: ReceiptListParams) =>
    apiRequestPaginated<ApiReceipt>("/receipts", { query: toQuery(params) }),
  get: (id: string) => apiRequest<ApiReceipt>(`/receipts/${id}`),
  create: (input: {
    soldPolicyId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
  }) => apiRequest<ApiReceipt>("/receipts", { method: "POST", body: input }),
};
