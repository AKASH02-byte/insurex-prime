import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CustomerDetailDialog, CustomerFormDialog } from "@/components/agent/CustomerDialogs";
import { SoldPolicyDialog } from "@/components/agent/SoldPolicyDialog";
import {
  CodeChip,
  CustomerStatusBadge,
  EmptyState,
  ErrorState,
  errorText,
  NativeSelect,
  PaginationBar,
  SectionCard,
  TableScroller,
  TableSkeleton,
  tdClass,
  thClass,
} from "@/components/agent/agent-ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { customersApi, retryUnlessClientError, type ApiCustomer } from "@/lib/api";
import type { CustomerStatus, InsuranceType } from "@/lib/api/types";
import { agentKeys } from "@/lib/agent-queries";
import { formatDate } from "@/lib/format";

interface CustomersSearch {
  search?: string | undefined;
  view?: string | undefined;
}

const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);

export const Route = createFileRoute("/agent/customers")({
  validateSearch: (raw: Record<string, unknown>): CustomersSearch => ({
    search: text(raw["search"]),
    view: text(raw["view"]),
  }),
  head: () => ({ meta: [{ title: "My Customers — InsuroX Prime" }] }),
  component: AgentCustomersPage,
});

const PAGE_SIZE = 10;

function AgentCustomersPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/agent/customers" });
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(params.search ?? "");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [insuranceType, setInsuranceType] = useState<InsuranceType | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCustomer | null>(null);
  const [deleting, setDeleting] = useState<ApiCustomer | null>(null);
  const [viewSaleId, setViewSaleId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  // The header search and quick actions arrive through the URL.
  useEffect(() => {
    if (params.search !== undefined) setSearch(params.search);
  }, [params.search]);
  useEffect(() => setPage(1), [debouncedSearch, status, insuranceType]);

  const listParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status || undefined,
    insuranceType: insuranceType || undefined,
    sortBy: "createdAt",
    order: "desc" as const,
  };
  const customers = useQuery({
    queryKey: agentKeys.customers(listParams),
    queryFn: () => customersApi.list(listParams),
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });

  const remove = useMutation({
    mutationFn: (customer: ApiCustomer) => customersApi.remove(customer.id),
    onSuccess: async (_, customer) => {
      toast.success(`${customer.fullName} was removed.`);
      setDeleting(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: agentKeys.customersAll }),
        queryClient.invalidateQueries({ queryKey: agentKeys.dashboardAll }),
      ]);
    },
    onError: (error) => {
      toast.error(errorText(error, "The customer could not be removed."));
      setDeleting(null);
    },
  });

  const openEdit = (customer: ApiCustomer) => {
    setEditing(customer);
    setFormOpen(true);
  };
  const setView = (view: string | undefined) =>
    void navigate({ search: (prev) => ({ ...prev, view }), replace: true });

  const filtersActive = Boolean(debouncedSearch || status || insuranceType);
  const rows = customers.data?.data ?? [];

  return (
    <>
      <SectionCard
        title="Customer book"
        icon={Users}
        description="Only customers assigned to you are listed."
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, customer ID, phone or email"
              aria-label="Search customers"
              className="h-9 rounded-xl pl-9 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <NativeSelect
              value={status}
              onChange={(event) => setStatus(event.target.value as CustomerStatus | "")}
              aria-label="Filter by status"
              className="flex-1 sm:flex-none"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="INACTIVE">Inactive</option>
            </NativeSelect>
            <NativeSelect
              value={insuranceType}
              onChange={(event) => setInsuranceType(event.target.value as InsuranceType | "")}
              aria-label="Filter by policy type held"
              className="flex-1 sm:flex-none"
            >
              <option value="">Any policy type</option>
              <option value="HEALTH">Holds Health</option>
              <option value="MOTOR">Holds Motor</option>
            </NativeSelect>
          </div>
        </div>

        {customers.isLoading && <TableSkeleton columns={6} />}
        {customers.error != null && !customers.data && (
          <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
        )}
        {customers.data &&
          rows.length === 0 &&
          (filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching customers"
              description="Try a different name, ID or filter."
              action={
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setInsuranceType("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={UserPlus}
              title="No customers yet"
              description="Customers appear here when you record a sold policy."
              action={
                <Button asChild className="rounded-xl">
                  <Link to="/agent/sell-policy">Record a sale</Link>
                </Button>
              }
            />
          ))}
        {rows.length > 0 && (
          <div className={customers.isPlaceholderData ? "opacity-60 transition-opacity" : ""}>
            <TableScroller>
              <thead>
                <tr className="border-b border-border/70">
                  {[
                    "Customer",
                    "Policy No",
                    "Contact",
                    "City",
                    "Policies",
                    "Status",
                    "Added",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className={`${thClass} ${heading === "Actions" ? "text-right" : ""} ${heading === "Policies" ? "text-center" : ""}`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {rows.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-muted/40">
                    <td className={`${tdClass} font-bold text-foreground`}>
                      <button
                        type="button"
                        onClick={() => setView(customer.id)}
                        className="cursor-pointer whitespace-nowrap text-left hover:text-primary hover:underline"
                      >
                        {customer.fullName}
                      </button>
                    </td>
                    <td className={tdClass}>
                      {customer.policyNumbers.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          {customer.policyNumbers.map((policyNumber) => (
                            <CodeChip key={policyNumber}>{policyNumber}</CodeChip>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={tdClass}>
                      <p className="whitespace-nowrap text-foreground">{customer.phone}</p>
                      <p className="max-w-48 truncate text-[11px] text-muted-foreground">
                        {customer.email ?? "—"}
                      </p>
                    </td>
                    <td className={`${tdClass} text-muted-foreground`}>{customer.city ?? "—"}</td>
                    <td className={`${tdClass} text-center tabular-nums`}>
                      {customer.policiesCount}
                    </td>
                    <td className={tdClass}>
                      <CustomerStatusBadge status={customer.status} />
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-muted-foreground`}>
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg px-2 text-xs"
                          onClick={() => setView(customer.id)}
                        >
                          <Eye /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg px-2 text-xs"
                          onClick={() => openEdit(customer)}
                          aria-label={`Edit ${customer.fullName}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg px-2 text-xs hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleting(customer)}
                          disabled={customer.policiesCount > 0}
                          title={
                            customer.policiesCount > 0
                              ? "Customers with policies can't be deleted — set them Inactive instead"
                              : undefined
                          }
                          aria-label={`Delete ${customer.fullName}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableScroller>
          </div>
        )}
        <PaginationBar meta={customers.data?.meta} onPageChange={setPage} noun="customers" />
      </SectionCard>

      {formOpen && (
        <CustomerFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          customer={editing}
          onClose={() => setFormOpen(false)}
        />
      )}
      <CustomerDetailDialog
        customerId={params.view ?? null}
        onClose={() => setView(undefined)}
        onEdit={(customer) => {
          setView(undefined);
          openEdit(customer);
        }}
        onViewPolicy={setViewSaleId}
      />
      <SoldPolicyDialog soldPolicyId={viewSaleId} onClose={() => setViewSaleId(null)} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the customer record. Customers with policies can't be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deleting) remove.mutate(deleting);
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
