import { apiRequest } from "./client";

export interface TenantProfile {
  name: string;
  legalName: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
}

export const tenantProfileKey = ["tenant", "profile"] as const;

export const tenantProfileApi = {
  get: () => apiRequest<TenantProfile>("/tenant/profile"),
  update: (body: Partial<Pick<TenantProfile, "logoUrl" | "contactPhone" | "address">>) =>
    apiRequest<TenantProfile>("/tenant/profile", { method: "PATCH", body }),
};
