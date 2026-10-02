import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, FilePlus2, RotateCcw, Search, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { SoldPolicyDialog } from "@/components/agent/SoldPolicyDialog";
import {
  CodeChip,
  EmptyState,
  ErrorState,
  InsuranceTypeBadge,
  NativeSelect,
  PaginationBar,
  PaymentStatusBadge,
  PolicyStatusBadge,
  SectionCard,
  TableScroller,
  TableSkeleton,
  tdClass,
  thClass,
} from "@/components/agent/agent-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { retryUnlessClientError, soldPoliciesApi } from "@/lib/api";
import type { InsuranceType, PaymentStatus, SoldPolicyStatus } from "@/lib/api/types";
import { agentKeys } from "@/lib/agent-queries";
import { formatDate, formatINR } from "@/lib/format";

const PAYMENT_STATUSES = ["PAID", "PENDING", "DUE", "FAILED", "REFUNDED"] as const;

interface SoldSearch {
  view?: string | undefined;
  search?: string | undefined;
  paymentStatus?: PaymentStatus | undefined;
}

const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);

export const Route = createFileRoute("/agent/sold-policies")({
  validateSearch: (raw: Record<string, unknown>): SoldSearch => ({
    view: text(raw["view"]),
    search: text(raw["search"]),
    paymentStatus: PAYMENT_STATUSES.find((status) => status === raw["paymentStatus"]),
  }),
  head: () => ({ meta: [{ title: "Sold Policies — InsureX Prime" }] }),
  component: SoldPoliciesPage,
});

const PAGE_SIZE = 10;
type SortKey = "issueDate" | "expiryDate" | "premium" | "createdAt";

function SoldPoliciesPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/agent/sold-policies" });
  const [search, setSearch] = useState(params.search ?? "");
  const [insuranceType, setInsuranceType] = useState<InsuranceType | "">("");
  const [policyStatus, setPolicyStatus] = useState<SoldPolicyStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">(
    params.paymentStatus ?? "",
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<`${SortKey}:${"asc" | "desc"}`>("issueDate:desc");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  useEffect(() => {
    if (params.paymentStatus) setPaymentStatus(params.paymentStatus);
  }, [params.paymentStatus]);
  const rangeInvalid = Boolean(from && to && from > to);
  useEffect(
    () => setPage(1),
    [debouncedSearch, insuranceType, policyStatus, paymentStatus, from, to, sort],
  );

  const [sortBy, order] = sort.split(":") as [SortKey, "asc" | "desc"];
  const listParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    insuranceType: insuranceType || undefined,
    policyStatus: policyStatus || undefined,
    paymentStatus: paymentStatus || undefined,
    from: !rangeInvalid ? from || undefined : undefined,
    to: !rangeInvalid ? to || undefined : undefined,
    sortBy,
    order,
  };
  const sold = useQuery({
    queryKey: agentKeys.soldPolicies(listParams),
    queryFn: () => soldPoliciesApi.list(listParams),
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });
  const rows = sold.data?.data ?? [];
  const filtersActive = Boolean(
    debouncedSearch || insuranceType || policyStatus || paymentStatus || from || to,
  );

  const resetFilters = () => {
    setSearch("");
    setInsuranceType("");
    setPolicyStatus("");
    setPaymentStatus("");
    setFrom("");
    setTo("");
    setSort("issueDate:desc");
    void navigate({ search: {}, replace: true });
  };
  const setView = (view: string | undefined) =>
    void navigate({ search: (prev) => ({ ...prev, view }), replace: true });

  return (
    <>
      <SectionCard
        title="My policy sales"
        icon={ShoppingBag}
        description="Every policy you have sold. Only your own sales are shown."
        actions={
          <Button asChild className="rounded-xl">
            <Link to="/agent/sell-policy">
              <FilePlus2 /> Record Sold Policy
            </Link>
          </Button>
        }
      >
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          <div className="relative col-span-2 md:col-span-4 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Policy no., customer or policy"
              aria-label="Search sold policies"
              className="h-9 rounded-xl pl-9 text-xs"
            />
          </div>
          <NativeSelect
            value={insuranceType}
            onChange={(event) => setInsuranceType(event.target.value as InsuranceType | "")}
            aria-label="Insurance type"
          >
            <option value="">All types</option>
            <option value="HEALTH">Health</option>
            <option value="MOTOR">Motor</option>
          </NativeSelect>
          <NativeSelect
            value={policyStatus}
            onChange={(event) => setPolicyStatus(event.target.value as SoldPolicyStatus | "")}
            aria-label="Policy status"
          >
            <option value="">Any policy status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </NativeSelect>
          <NativeSelect
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus | "")}
            aria-label="Payment status"
          >
            <option value="">Any payment</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="DUE">Due</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </NativeSelect>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Issued from"
            title="Issued from"
            className="h-9 rounded-xl text-xs"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="Issued to"
            title="Issued to"
            aria-invalid={rangeInvalid}
            className={`h-9 rounded-xl text-xs ${rangeInvalid ? "border-destructive" : ""}`}
          />
          <NativeSelect
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            aria-label="Sort by"
          >
            <option value="issueDate:desc">Newest issued</option>
            <option value="issueDate:asc">Oldest issued</option>
            <option value="expiryDate:asc">Expiring first</option>
            <option value="premium:desc">Highest premium</option>
            <option value="premium:asc">Lowest premium</option>
          </NativeSelect>
        </div>
        {rangeInvalid && (
          <p className="-mt-2 mb-3 text-xs text-destructive">
            The "from" date must be on or before the "to" date.
          </p>
        )}

        {sold.isLoading && <TableSkeleton columns={7} />}
        {sold.error != null && !sold.data && (
          <ErrorState error={sold.error} onRetry={() => void sold.refetch()} />
        )}
        {sold.data &&
          rows.length === 0 &&
          (filtersActive ? (
            <EmptyState
              icon={Search}
              title="No sales match these filters"
              action={
                <Button variant="outline" className="rounded-xl" onClick={resetFilters}>
                  <RotateCcw /> Reset filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ShoppingBag}
              title="No policies sold yet"
              description="Start your first policy sale to see it here."
              action={
                <Button asChild className="rounded-xl">
                  <Link to="/agent/sell-policy">
                    <FilePlus2 /> Record your first sold policy
                  </Link>
                </Button>
              }
            />
          ))}
        {rows.length > 0 && (
          <div className={sold.isPlaceholderData ? "opacity-60 transition-opacity" : ""}>
            <TableScroller>
              <thead>
                <tr className="border-b border-border/70">
                  {[
                    "Policy Number",
                    "Customer",
                    "Policy",
                    "Insurance Type",
                    "Premium",
                    "Issue Date",
                    "Expiry Date",
                    "Payment",
                    "Policy Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className={`${thClass} ${heading === "Premium" || heading === "Actions" ? "text-right" : ""}`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {rows.map((sale) => (
                  <tr key={sale.id} className="transition-colors hover:bg-muted/40">
                    <td className={tdClass}>
                      <CodeChip>{sale.policyNumber}</CodeChip>
                    </td>
                    <td className={`${tdClass} font-bold text-foreground`}>
                      <p className="whitespace-nowrap">{sale.customer.fullName}</p>
                      <p className="font-mono text-[11px] font-normal text-muted-foreground">
                        {sale.customer.customerCode}
                      </p>
                    </td>
                    <td className={tdClass}>{sale.policy.policyName}</td>
                    <td className={tdClass}>
                      <InsuranceTypeBadge type={sale.policy.insuranceType} />
                    </td>
                    <td
                      className={`${tdClass} whitespace-nowrap text-right font-display font-extrabold`}
                    >
                      {formatINR(sale.premium)}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-muted-foreground`}>
                      {formatDate(sale.issueDate)}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-muted-foreground`}>
                      {formatDate(sale.expiryDate)}
                    </td>
                    <td className={tdClass}>
                      <PaymentStatusBadge status={sale.paymentStatus} />
                    </td>
                    <td className={tdClass}>
                      <PolicyStatusBadge status={sale.policyStatus} />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg px-2 text-xs"
                          onClick={() => setView(sale.id)}
                        >
                          <Eye /> View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableScroller>
          </div>
        )}
        <PaginationBar meta={sold.data?.meta} onPageChange={setPage} noun="sales" />
      </SectionCard>

      <SoldPolicyDialog soldPolicyId={params.view ?? null} onClose={() => setView(undefined)} />
    </>
  );
}
