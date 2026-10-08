import { apiRequest, toQuery } from "./client";
import type { InsuranceType, PolicyStatus } from "./types";

export interface CatalogPolicy {
  id: string;
  policyCode: string;
  policyName: string;
  status: PolicyStatus;
  /** Null when the sale is priced on the insurer's own portal. */
  premium: number | null;
  coverageAmount: number | null;
  durationMonths: number | null;
}

export interface CatalogSubCategory {
  id: string;
  name: string;
  sortOrder: number;
  policies: CatalogPolicy[];
}

export interface CatalogCategory {
  id: string;
  name: string;
  sortOrder: number;
  subCategories: CatalogSubCategory[];
  policies: CatalogPolicy[];
}

export interface CatalogLine {
  line: InsuranceType;
  categories: CatalogCategory[];
  policies: CatalogPolicy[];
}

export interface CatalogInsurer {
  insurer: { id: string; code: string; name: string };
  businessCode: string;
  lines: CatalogLine[];
}

export interface CatalogTree {
  insurers: CatalogInsurer[];
}

export interface ApiCategory {
  id: string;
  insurerId: string;
  line: InsuranceType;
  parentId: string | null;
  name: string;
  sortOrder: number;
  policyCount: number;
}

export const catalogKeys = { all: ["catalog"] as const, tree: ["catalog", "tree"] as const };

export const catalogApi = {
  tree: (params: { insurerId?: string; line?: InsuranceType } = {}) =>
    apiRequest<CatalogTree>("/catalog/tree", { query: toQuery(params) }),
  createCategory: (body: {
    insurerId?: string;
    line: InsuranceType;
    name: string;
    parentId?: string | null;
    sortOrder?: number;
  }) => apiRequest<ApiCategory>("/catalog/categories", { method: "POST", body }),
  updateCategory: (id: string, body: { name?: string; sortOrder?: number }) =>
    apiRequest<ApiCategory>(`/catalog/categories/${id}`, { method: "PATCH", body }),
  removeCategory: (id: string) =>
    apiRequest<{ id: string }>(`/catalog/categories/${id}`, { method: "DELETE" }),
};
