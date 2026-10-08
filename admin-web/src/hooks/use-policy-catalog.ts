import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  policyProductsList,
  premiumRanges,
  type PolicyInsuranceType,
  type PolicyProduct,
  type PolicyProductStatus,
} from "@/components/admin/policies-mock-data";
import { ApiError, dashboardApi, isApiConfigured, policiesApi, reportsApi } from "@/lib/api";
import { toPolicyInput, toPolicyProduct, typeFromApi, typeToApi } from "@/lib/api/policy-mappers";

export interface PolicyCatalogFilters {
  search: string;
  type: "All" | PolicyInsuranceType;
  status: "All" | PolicyProductStatus;
  premiumRangeId: string;
  page: number;
  pageSize: number;
}

export interface PolicyKpis {
  total: number;
  active: number;
  health: number;
  healthActive: number;
  motor: number;
  motorActive: number;
  life: number;
  lifeActive: number;
  commercial: number;
  commercialActive: number;
}

export interface PolicyCatalog {
  source: "demo" | "api";
  /** Current page of policies matching the filters. */
  rows: PolicyProduct[];
  filteredTotal: number;
  totalPages: number;
  kpis: PolicyKpis;
  salesByType: { type: PolicyInsuranceType; sold: number }[];
  topPolicies: { name: string; type: PolicyInsuranceType; sold: number }[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  /** Codes known to be taken (demo only; the API rejects duplicates itself). */
  existingCodes: string[];
  /** `draft.id` and `draft.policiesSold` are ignored. */
  create: (draft: PolicyProduct) => Promise<PolicyProduct>;
  update: (policy: PolicyProduct) => Promise<PolicyProduct>;
  setStatus: (policy: PolicyProduct, status: PolicyProductStatus) => Promise<PolicyProduct>;
  remove: (policy: PolicyProduct) => Promise<void>;
  duplicate: (policy: PolicyProduct) => Promise<PolicyProduct>;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const copyOf = (source: PolicyProduct, code: string): PolicyProduct => ({
  ...source,
  code,
  name: `${source.name} (Copy)`,
  benefits: [...source.benefits],
  status: "Inactive",
  policiesSold: 0,
  lastUpdated: todayIso(),
});

// ─── Demo data (frontend state only) ──────────────────────────────────────────
function useDemoPolicyCatalog(filters: PolicyCatalogFilters): PolicyCatalog {
  const [policies, setPolicies] = useState<PolicyProduct[]>(policyProductsList);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase();
    const range = premiumRanges.find((item) => item.id === filters.premiumRangeId);
    return policies.filter(
      (policy) =>
        (!query ||
          policy.name.toLocaleLowerCase().includes(query) ||
          policy.code.toLocaleLowerCase().includes(query)) &&
        (filters.type === "All" || policy.type === filters.type) &&
        (filters.status === "All" || policy.status === filters.status) &&
        (!range || (policy.premium >= range.min && policy.premium <= range.max)),
    );
  }, [policies, filters.search, filters.type, filters.status, filters.premiumRangeId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const count = (predicate: (policy: PolicyProduct) => boolean) =>
    policies.filter(predicate).length;

  const nextId = () => {
    const highest = policies.reduce(
      (max, policy) => Math.max(max, Number(policy.id.replace("PRD-", "")) || 0),
      0,
    );
    return `PRD-${String(highest + 1).padStart(3, "0")}`;
  };

  return {
    source: "demo",
    rows: filtered.slice((page - 1) * filters.pageSize, page * filters.pageSize),
    filteredTotal: filtered.length,
    totalPages,
    kpis: {
      total: policies.length,
      active: count((policy) => policy.status === "Active"),
      health: count((policy) => policy.type === "Health"),
      healthActive: count((policy) => policy.type === "Health" && policy.status === "Active"),
      motor: count((policy) => policy.type === "Motor"),
      motorActive: count((policy) => policy.type === "Motor" && policy.status === "Active"),
      life: count((policy) => policy.type === "Life"),
      lifeActive: count((policy) => policy.type === "Life" && policy.status === "Active"),
      commercial: count((policy) => policy.type === "Commercial"),
      commercialActive: count(
        (policy) => policy.type === "Commercial" && policy.status === "Active",
      ),
    },
    salesByType: (["Health", "Motor"] as const).map((type) => ({
      type,
      sold: policies
        .filter((policy) => policy.type === type)
        .reduce((total, policy) => total + policy.policiesSold, 0),
    })),
    topPolicies: [...policies]
      .sort((a, b) => b.policiesSold - a.policiesSold)
      .slice(0, 5)
      .map((policy) => ({ name: policy.name, type: policy.type, sold: policy.policiesSold })),
    isLoading: false,
    error: null,
    retry: () => undefined,
    existingCodes: policies.map((policy) => policy.code),
    async create(draft) {
      const created = { ...draft, id: nextId(), policiesSold: 0, lastUpdated: todayIso() };
      setPolicies((previous) => [created, ...previous]);
      return created;
    },
    async update(policy) {
      const updated = { ...policy, lastUpdated: todayIso() };
      setPolicies((previous) => previous.map((item) => (item.id === policy.id ? updated : item)));
      return updated;
    },
    async setStatus(policy, status) {
      const updated = { ...policy, status, lastUpdated: todayIso() };
      setPolicies((previous) => previous.map((item) => (item.id === policy.id ? updated : item)));
      return updated;
    },
    async remove(policy) {
      setPolicies((previous) => previous.filter((item) => item.id !== policy.id));
    },
    async duplicate(source) {
      const codes = new Set(policies.map((policy) => policy.code));
      let code = `${source.code}-COPY`;
      for (let suffix = 2; codes.has(code); suffix += 1) code = `${source.code}-COPY${suffix}`;
      const copy = { ...copyOf(source, code), id: nextId() };
      setPolicies((previous) => {
        const index = previous.findIndex((policy) => policy.id === source.id);
        return [...previous.slice(0, index + 1), copy, ...previous.slice(index + 1)];
      });
      return copy;
    },
  };
}

// ─── Backend API (VITE_API_BASE_URL) ──────────────────────────────────────────
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

function useApiPolicyCatalog(filters: PolicyCatalogFilters): PolicyCatalog {
  const queryClient = useQueryClient();
  const enabled = typeof window !== "undefined";
  const range = premiumRanges.find((item) => item.id === filters.premiumRangeId);

  // Filtering, sorting and pagination all happen in the database.
  const list = useQuery({
    queryKey: ["policies", "list", filters],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () =>
      policiesApi.list({
        page: filters.page,
        limit: filters.pageSize,
        sortBy: "createdAt",
        order: "desc",
        ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
        ...(filters.type !== "All" ? { insuranceType: typeToApi[filters.type] } : {}),
        ...(filters.status !== "All"
          ? { status: filters.status === "Active" ? "ACTIVE" : "INACTIVE" }
          : {}),
        ...(range && range.min > 0 ? { premiumMin: range.min } : {}),
        ...(range && Number.isFinite(range.max) ? { premiumMax: range.max } : {}),
      }),
  });

  const kpis = useQuery({
    queryKey: ["policies", "kpis"],
    enabled,
    queryFn: async (): Promise<PolicyKpis> => {
      const total = (params: Parameters<typeof policiesApi.list>[0]) =>
        policiesApi.list({ ...params, limit: 1 }).then((result) => result.meta.total);
      const [
        all,
        active,
        health,
        healthActive,
        motor,
        motorActive,
        life,
        lifeActive,
        commercial,
        commercialActive,
      ] = await Promise.all([
        total({}),
        total({ status: "ACTIVE" }),
        total({ insuranceType: "HEALTH" }),
        total({ insuranceType: "HEALTH", status: "ACTIVE" }),
        total({ insuranceType: "MOTOR" }),
        total({ insuranceType: "MOTOR", status: "ACTIVE" }),
        total({ insuranceType: "LIFE" }),
        total({ insuranceType: "LIFE", status: "ACTIVE" }),
        total({ insuranceType: "COMMERCIAL" }),
        total({ insuranceType: "COMMERCIAL", status: "ACTIVE" }),
      ]);
      return {
        total: all,
        active,
        health,
        healthActive,
        motor,
        motorActive,
        life,
        lifeActive,
        commercial,
        commercialActive,
      };
    },
  });

  const analytics = useQuery({
    queryKey: ["policies", "analytics"],
    enabled,
    queryFn: async () => {
      const [distribution, top] = await Promise.all([
        dashboardApi.policyDistribution(),
        reportsApi.policies({ limit: 5, sortBy: "policiesSold" }),
      ]);
      return {
        salesByType: distribution.map((row) => ({
          type: typeFromApi[row.insuranceType],
          sold: row.policiesSold,
        })),
        topPolicies: top.data.map((row) => ({
          name: row.policyName,
          type: typeFromApi[row.insuranceType],
          sold: row.policiesSold,
        })),
      };
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["policies"] });
  const mutation = useMutation({
    mutationFn: (run: () => Promise<PolicyProduct | void>) => run(),
    onSuccess: invalidate,
  });
  const mutate = <T extends PolicyProduct | void>(run: () => Promise<T>) =>
    mutation.mutateAsync(run) as Promise<T>;

  const total = list.data?.meta.total ?? 0;
  const firstError = list.error ?? kpis.error ?? analytics.error;

  return {
    source: "api",
    rows: (list.data?.data ?? []).map(toPolicyProduct),
    filteredTotal: total,
    totalPages: list.data?.meta.totalPages ?? 1,
    kpis: kpis.data ?? {
      total: 0,
      active: 0,
      health: 0,
      healthActive: 0,
      motor: 0,
      motorActive: 0,
      life: 0,
      lifeActive: 0,
      commercial: 0,
      commercialActive: 0,
    },
    salesByType: analytics.data?.salesByType ?? [
      { type: "Health", sold: 0 },
      { type: "Motor", sold: 0 },
    ],
    topPolicies: analytics.data?.topPolicies ?? [],
    isLoading: list.isPending,
    error: firstError ? errorMessage(firstError) : null,
    retry: () => void invalidate(),
    existingCodes: [],
    create: (draft) =>
      mutate(async () => toPolicyProduct(await policiesApi.create(toPolicyInput(draft)))),
    update: (policy) =>
      mutate(async () =>
        toPolicyProduct(await policiesApi.update(policy.id, toPolicyInput(policy))),
      ),
    setStatus: (policy, status) =>
      mutate(async () =>
        toPolicyProduct(
          await policiesApi.setStatus(policy.id, status === "Active" ? "ACTIVE" : "INACTIVE"),
        ),
      ),
    remove: (policy) =>
      mutate(async () => {
        await policiesApi.remove(policy.id);
      }),
    duplicate: (source) =>
      mutate(async () => {
        // The server enforces unique codes; try a few suffixes.
        for (let attempt = 1; attempt <= 5; attempt += 1) {
          const code = attempt === 1 ? `${source.code}-COPY` : `${source.code}-COPY${attempt}`;
          try {
            return toPolicyProduct(await policiesApi.create(toPolicyInput(copyOf(source, code))));
          } catch (error) {
            if (!(error instanceof ApiError && error.code === "CONFLICT") || attempt === 5) {
              throw error;
            }
          }
        }
        throw new Error("Could not duplicate the policy.");
      }),
  };
}

/**
 * Policy catalog data for the Super Admin Policies page. Uses the backend when
 * VITE_API_BASE_URL is configured, otherwise the built-in demo data.
 */
export const usePolicyCatalog: (filters: PolicyCatalogFilters) => PolicyCatalog = isApiConfigured
  ? useApiPolicyCatalog
  : useDemoPolicyCatalog;
