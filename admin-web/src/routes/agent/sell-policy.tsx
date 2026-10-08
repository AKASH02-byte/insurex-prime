import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  RefreshCw,
  FilePlus2,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DetailRow,
  EmptyState,
  ErrorState,
  errorText,
  InsuranceTypeBadge,
  NativeSelect,
  SectionCard,
} from "@/components/agent/agent-ui";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  agentsApi,
  catalogApi,
  customersApi,
  policiesApi,
  retryUnlessClientError,
  soldPoliciesApi,
  type ApiCustomer,
  type ApiPolicy,
  type ApiSoldPolicyDetail,
  type CatalogLine,
} from "@/lib/api";
import { adminKeys } from "@/lib/admin-queries";
import { agentKeys } from "@/lib/agent-queries";
import {
  formatDate,
  formatDuration,
  formatINR,
  insuranceTypeLabel,
  shiftIsoDate,
  todayIso,
} from "@/lib/format";

interface SellSearch {
  policyId?: string | undefined;
  /** Renewal mode: pick an existing customer and start from their last policy. */
  renewal?: true | undefined;
}

const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);

export const Route = createFileRoute("/agent/sell-policy")({
  validateSearch: (raw: Record<string, unknown>): SellSearch => ({
    policyId: text(raw["policyId"]),
    renewal: raw["renewal"] === true || raw["renewal"] === "true" ? true : undefined,
  }),
  head: () => ({ meta: [{ title: "Record Policy — InsuroX Prime" }] }),
  component: RecordSoldPolicyPage,
});

// Mirrors the backend's window for agent issue dates (it re-checks on submit).
const ISSUE_PAST_DAYS = 30;
const ISSUE_FUTURE_DAYS = 90;

function Stepper({ step }: { step: 1 | 2 }) {
  const steps = ["Policy catalog", "Sale details"];
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Progress">
      {steps.map((label, index) => {
        const number = (index + 1) as 1 | 2;
        const done = number < step;
        const current = number === step;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-current={current ? "step" : undefined}
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : current
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <Check className="size-3.5" /> : number}
            </span>
            <span
              className={`truncate font-semibold ${current ? "text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {index < steps.length - 1 && <span className="hidden h-px flex-1 bg-border sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export interface CustomerDraft {
  fullName: string;
  phone: string;
  email: string;
}

const emptyCustomer: CustomerDraft = {
  fullName: "",
  phone: "",
  email: "",
};

/** Same rules as the API, so most mistakes are caught before a request. */
function validateCustomer(form: CustomerDraft) {
  const errors: Partial<Record<keyof CustomerDraft, string>> = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Enter the customer's full name.";
  const phone = form.phone.trim();
  if (!/^[+\d][\d\s-]*$/.test(phone) || phone.length < 7 || phone.length > 20) {
    errors.phone = "Enter a valid phone number (digits, spaces, + and - only).";
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

/** Only fields with a value are sent; the API assigns the customer to the signed-in agent. */
function toCustomerInput(form: CustomerDraft) {
  const input: Parameters<typeof customersApi.create>[0] = {
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
  };
  if (form.email.trim()) input.email = form.email.trim();
  return input;
}

export interface CatalogSelection {
  insurerId: string;
  line: string;
  categoryId: string;
  subCategoryId: string;
  policyId: string;
}

const emptySelection: CatalogSelection = {
  insurerId: "",
  line: "",
  categoryId: "",
  subCategoryId: "",
  policyId: "",
};

/** Health policies are picked straight from the line; other lines go through categories. */
const usesCategories = (line: CatalogLine | undefined) =>
  line !== undefined && line.line !== "HEALTH" && line.categories.length > 0;

/** Every policy of a line, whichever category or sub-category it sits in. */
function allPoliciesOfLine(line: CatalogLine) {
  return [
    ...line.policies,
    ...line.categories.flatMap((category) => [
      ...category.policies,
      ...category.subCategories.flatMap((subCategory) => subCategory.policies),
    ]),
  ].sort((a, b) => a.policyName.localeCompare(b.policyName));
}

function RenewalPicker({
  customer,
  onSelectCustomer,
  busy,
}: {
  customer: ApiCustomer | null;
  onSelectCustomer: (customer: ApiCustomer) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim());
  const params = {
    limit: 50,
    sortBy: "fullName",
    order: "asc" as const,
    search: debounced || undefined,
  };
  const customers = useQuery({
    queryKey: agentKeys.customers({ ...params, renewalPicker: true }),
    queryFn: () => customersApi.list(params),
    enabled: open,
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });

  return (
    <div className="rounded-xl border border-border/80 bg-background/90 p-3 shadow-xs sm:rounded-2xl sm:p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <RefreshCw className="size-3.5 text-primary" /> Record renewed policy
      </h2>
      <div className="mt-3 max-w-md">
        <p className="mb-1 text-xs text-muted-foreground">
          Pick the customer. Their last policy and details are filled in. You can still change the
          policy if they upgraded.
        </p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={busy}
              className="h-10 w-full justify-between rounded-xl font-normal"
            >
              <span className="truncate">
                {customer ? `${customer.fullName} · ${customer.phone}` : "Select customer"}
              </span>
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ChevronsUpDown className="opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by name, phone or code…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                {customers.isLoading && (
                  <p className="p-3 text-xs text-muted-foreground">Loading customers…</p>
                )}
                {customers.error != null && !customers.data && (
                  <p className="p-3 text-xs text-destructive">
                    {errorText(customers.error, "Customers could not be loaded.")}
                  </p>
                )}
                {customers.data && <CommandEmpty>No customers found.</CommandEmpty>}
                <CommandGroup>
                  {(customers.data?.data ?? []).map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        setOpen(false);
                        onSelectCustomer(item);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.fullName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {item.phone} · {item.customerCode}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function PolicyStep({
  selection,
  onSelectionChange,
  onSelect,
}: {
  selection: CatalogSelection;
  onSelectionChange: (selection: CatalogSelection) => void;
  onSelect: (policy: ApiPolicy) => void;
}) {
  const tree = useQuery({
    queryKey: [...agentKeys.all, "catalog-tree"],
    queryFn: () => catalogApi.tree(),
    retry: retryUnlessClientError,
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const insurers = (tree.data?.insurers ?? []).filter((item) => item.lines.length > 0);
  // An agency with a single insurer needs no insurer choice.
  const insurer = insurers.find(
    (item) =>
      item.insurer.id ===
      (selection.insurerId || (insurers.length === 1 ? insurers[0]!.insurer.id : "")),
  );
  const lines = insurer?.lines ?? [];
  // An insurer with a single line of business needs no line choice.
  const line = lines.find(
    (item) => item.line === (selection.line || (lines.length === 1 ? lines[0]!.line : "")),
  );
  // A preselected policy (e.g. a renewal) fills in the category and sub-category it sits in.
  const owning = line?.categories
    .flatMap((item) => [
      { category: item, subCategoryId: "", policies: item.policies },
      ...item.subCategories.map((sub) => ({
        category: item,
        subCategoryId: sub.id,
        policies: sub.policies,
      })),
    ])
    .find((entry) => entry.policies.some((policy) => policy.id === selection.policyId));
  const category =
    line?.categories.find((item) => item.id === selection.categoryId) ?? owning?.category;
  const subCategory = category?.subCategories.find(
    (item) => item.id === (selection.subCategoryId || owning?.subCategoryId),
  );
  const policies = !line
    ? []
    : !usesCategories(line)
      ? allPoliciesOfLine(line)
      : subCategory
        ? subCategory.policies
        : (category?.policies ?? []);

  const choose = async (policyId: string) => {
    if (!policyId) return;
    onSelectionChange({ ...selection, policyId });
    setLoadingId(policyId);
    try {
      onSelect(await policiesApi.get(policyId));
    } catch (error) {
      toast.error(errorText(error, "That policy could not be opened."));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <SectionCard
      title="1. Choose the policy you sold"
      icon={Shield}
      description={
        insurers.length > 1
          ? "Pick the insurer, line, category and policy."
          : insurer
            ? `${insurer.insurer.name}: pick the line, category and policy.`
            : "Pick the line, category and policy."
      }
    >
      {tree.isLoading && <Skeleton className="h-48 rounded-xl" />}
      {tree.error != null && !tree.data && (
        <ErrorState error={tree.error} onRetry={() => void tree.refetch()} />
      )}
      {tree.data && insurers.length === 0 && (
        <EmptyState
          icon={Shield}
          title="No active policies yet"
          description="Ask your agency admin to add policies to the catalog."
        />
      )}
      {insurers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {insurers.length > 1 && (
            <Field id="sell-insurer" label="Insurance company" required>
              <NativeSelect
                id="sell-insurer"
                value={insurer?.insurer.id ?? ""}
                onChange={(event) => {
                  onSelectionChange({ ...emptySelection, insurerId: event.target.value });
                }}
                className="h-10 w-full text-sm"
              >
                <option value="">Select insurer</option>
                {insurers.map((item) => (
                  <option key={item.insurer.id} value={item.insurer.id}>
                    {item.insurer.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          {insurer && (
            <Field id="sell-line" label="Line of business" required>
              <NativeSelect
                id="sell-line"
                value={line?.line ?? ""}
                onChange={(event) => {
                  onSelectionChange({
                    ...emptySelection,
                    insurerId: insurer.insurer.id,
                    line: event.target.value,
                  });
                }}
                className="h-10 w-full text-sm"
              >
                <option value="">Select line</option>
                {lines.map((item) => (
                  <option key={item.line} value={item.line}>
                    {insuranceTypeLabel[item.line]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          {usesCategories(line) && (
            <Field id="sell-category" label="Category" required>
              <NativeSelect
                id="sell-category"
                value={category?.id ?? ""}
                onChange={(event) =>
                  onSelectionChange({
                    ...selection,
                    categoryId: event.target.value,
                    subCategoryId: "",
                    policyId: "",
                  })
                }
                className="h-10 w-full text-sm"
              >
                <option value="">Select category</option>
                {line!.categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          {category && category.subCategories.length > 0 && (
            <Field id="sell-subcategory" label="Sub-category">
              <NativeSelect
                id="sell-subcategory"
                value={subCategory?.id ?? ""}
                onChange={(event) =>
                  onSelectionChange({
                    ...selection,
                    subCategoryId: event.target.value,
                    policyId: "",
                  })
                }
                className="h-10 w-full text-sm"
              >
                <option value="">All {category.name}</option>
                {category.subCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          {line && (!usesCategories(line) || category) && (
            <Field id="sell-policy" label="Policy" required>
              <NativeSelect
                id="sell-policy"
                value={
                  policies.some((item) => item.id === selection.policyId) ? selection.policyId : ""
                }
                disabled={loadingId !== null || policies.length === 0}
                onChange={(event) => void choose(event.target.value)}
                className="h-10 w-full text-sm"
              >
                <option value="">
                  {policies.length === 0 ? "No policies here" : "Select policy"}
                </option>
                {policies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.policyName}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        </div>
      )}
      {loadingId !== null && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Opening policy…
        </p>
      )}
    </SectionCard>
  );
}

interface SaleDraft {
  insurerPolicyNumber: string;
  issueDate: string;
  expiryDate: string;
  premium: string;
  coverageAmount: string;
  notes: string;
}

function SaleForm({
  policy,
  renewalCustomer,
  adminMode,
  onChangePolicy,
  onSold,
}: {
  policy: ApiPolicy;
  /** Admins record on behalf of an agent they pick; agents always record their own sales. */
  adminMode: boolean;
  /** Set when recording a renewal: the existing customer is reused, not created. */
  renewalCustomer: ApiCustomer | null;
  onChangePolicy: () => void;
  onSold: (sale: ApiSoldPolicyDetail) => void;
}) {
  const queryClient = useQueryClient();
  const today = todayIso();
  // The backend applies the issue-date window to agents only.
  const minDate = adminMode ? "" : shiftIsoDate(today, -ISSUE_PAST_DAYS);
  const maxDate = adminMode ? "" : shiftIsoDate(today, ISSUE_FUTURE_DAYS);
  const [agentId, setAgentId] = useState("");
  const agents = useQuery({
    queryKey: [...adminKeys.agents, "active-for-sale"],
    queryFn: () => agentsApi.list({ limit: 100, status: "ACTIVE" }),
    enabled: adminMode,
    retry: retryUnlessClientError,
  });
  // Catalog policies without a price or term are quoted on the insurer's portal: the agent
  // enters the real figures. Otherwise the catalog premium and term apply.
  const pricedByAgent = policy.premium === null;
  const termByAgent = policy.durationMonths === null;
  const [customer, setCustomer] = useState<CustomerDraft>(
    renewalCustomer
      ? {
          fullName: renewalCustomer.fullName,
          phone: renewalCustomer.phone,
          email: renewalCustomer.email ?? "",
        }
      : emptyCustomer,
  );
  const [form, setForm] = useState<SaleDraft>({
    insurerPolicyNumber: "",
    issueDate: today,
    expiryDate: "",
    premium: policy.premium === null ? "" : String(policy.premium),
    coverageAmount: "",
    notes: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CustomerDraft | keyof SaleDraft | "agentId", string>>
  >({});
  // Kept across retries so a failed sale never creates the same customer twice.
  const [savedCustomer, setSavedCustomer] = useState<ApiCustomer | null>(renewalCustomer);

  const clearError = (key: keyof typeof errors) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  const setC = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => {
    setCustomer((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const set = <K extends keyof SaleDraft>(key: K, value: SaleDraft[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const record = useMutation({
    mutationFn: async () => {
      const owner =
        savedCustomer ??
        (await customersApi.create({
          ...toCustomerInput(customer),
          ...(adminMode ? { assignedAgentId: agentId } : {}),
        }));
      setSavedCustomer(owner);
      return soldPoliciesApi.create({
        policyId: policy.id,
        customerId: owner.id,
        ...(adminMode ? { agentId } : {}),
        issueDate: form.issueDate,
        ...(pricedByAgent ? { premium: Number(form.premium) } : {}),
        ...(termByAgent ? { expiryDate: form.expiryDate } : {}),
        ...(form.insurerPolicyNumber.trim()
          ? { insurerPolicyNumber: form.insurerPolicyNumber.trim() }
          : {}),
      });
    },
    onSuccess: async (sale) => {
      toast.success(`Policy ${sale.policyNumber} recorded for ${sale.customer.fullName}.`);
      await Promise.all(
        [
          agentKeys.dashboardAll,
          agentKeys.soldPoliciesAll,
          agentKeys.customersAll,
          // Same-browser Super Admin tabs refresh at once; other sessions pick it up on their poll.
          adminKeys.all,
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      onSold(sale);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problems: typeof errors = renewalCustomer ? {} : validateCustomer(customer);
    if (adminMode && !agentId) problems.agentId = "Select the agent who sold this policy.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.issueDate)) {
      problems.issueDate = "Enter a valid issue date.";
    } else if (!adminMode && (form.issueDate < minDate || form.issueDate > maxDate)) {
      problems.issueDate = `Choose a date between ${formatDate(minDate)} and ${formatDate(maxDate)}.`;
    }
    if (termByAgent) {
      if (!form.expiryDate) problems.expiryDate = "Enter the expiry date.";
      else if (form.expiryDate <= form.issueDate)
        problems.expiryDate = "Must be after the issue date.";
    }
    if (pricedByAgent && !(Number(form.premium) > 0)) {
      problems.premium = "Enter the premium amount.";
    }
    setErrors(problems);
    if (Object.keys(problems).length === 0) record.mutate();
  };

  const inputClass = (key: keyof CustomerDraft | keyof SaleDraft) =>
    `h-10 rounded-xl ${errors[key] ? "border-destructive" : ""}`;

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {adminMode && (
          <SectionCard
            title="Sold by"
            icon={UserRound}
            description="Record this sale on behalf of the agent who made it."
          >
            <Field id="rec-agent" label="Select agent" required error={errors.agentId}>
              <NativeSelect
                id="rec-agent"
                value={agentId}
                disabled={agents.isLoading}
                onChange={(event) => {
                  setAgentId(event.target.value);
                  if (errors.agentId) clearError("agentId");
                }}
                className="h-10 w-full text-sm"
              >
                <option value="">{agents.isLoading ? "Loading agents…" : "Select agent"}</option>
                {(agents.data?.data ?? []).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName} ({agent.agentCode})
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </SectionCard>
        )}
        <SectionCard
          title="Customer details"
          icon={UserRound}
          description={
            renewalCustomer
              ? "Existing customer: this renewal is added to their record."
              : "Type in the details of the customer you sold the policy to."
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="rec-name" label="Full name" required error={errors.fullName}>
              <Input
                id="rec-name"
                autoFocus={!renewalCustomer}
                readOnly={Boolean(renewalCustomer)}
                value={customer.fullName}
                onChange={(event) => setC("fullName", event.target.value)}
                aria-invalid={Boolean(errors.fullName)}
                className={inputClass("fullName")}
              />
            </Field>
            <Field id="rec-phone" label="Phone" required error={errors.phone}>
              <Input
                id="rec-phone"
                type="tel"
                readOnly={Boolean(renewalCustomer)}
                value={customer.phone}
                onChange={(event) => setC("phone", event.target.value)}
                aria-invalid={Boolean(errors.phone)}
                className={inputClass("phone")}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="rec-email" label="Email" error={errors.email}>
                <Input
                  id="rec-email"
                  type="email"
                  readOnly={Boolean(renewalCustomer)}
                  value={customer.email}
                  onChange={(event) => setC("email", event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  className={inputClass("email")}
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Policy details" icon={Shield}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="rec-issue" label="Issue date" required error={errors.issueDate}>
              <Input
                id="rec-issue"
                type="date"
                min={minDate || undefined}
                max={maxDate || undefined}
                value={form.issueDate}
                onChange={(event) => set("issueDate", event.target.value)}
                aria-invalid={Boolean(errors.issueDate)}
                className={inputClass("issueDate")}
              />
            </Field>
            <Field
              id="rec-expiry"
              label="Expiry date"
              required={termByAgent}
              error={errors.expiryDate}
              {...(termByAgent
                ? {}
                : {
                    hint: `Calculated from the policy term (${formatDuration(policy.durationMonths)}).`,
                  })}
            >
              <Input
                id="rec-expiry"
                type="date"
                min={form.issueDate}
                disabled={!termByAgent}
                value={termByAgent ? form.expiryDate : ""}
                onChange={(event) => set("expiryDate", event.target.value)}
                aria-invalid={Boolean(errors.expiryDate)}
                className={inputClass("expiryDate")}
              />
            </Field>
            <Field
              id="rec-premium"
              label="Premium (₹)"
              required={pricedByAgent}
              error={errors.premium}
              {...(pricedByAgent ? {} : { hint: "Fixed by the catalog." })}
            >
              <Input
                id="rec-premium"
                disabled={!pricedByAgent}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.premium}
                onChange={(event) => set("premium", event.target.value)}
                aria-invalid={Boolean(errors.premium)}
                className={inputClass("premium")}
              />
            </Field>
            <Field
              id="rec-insurer-number"
              label="Insurer policy number"
              hint="The number issued on the insurer's portal, if you have it."
            >
              <Input
                id="rec-insurer-number"
                maxLength={60}
                value={form.insurerPolicyNumber}
                onChange={(event) => set("insurerPolicyNumber", event.target.value)}
                className="h-10 rounded-xl"
              />
            </Field>
            <Field id="rec-coverage" label="Coverage amount (₹)" error={errors.coverageAmount}>
              <Input
                id="rec-coverage"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.coverageAmount}
                onChange={(event) => set("coverageAmount", event.target.value)}
                aria-invalid={Boolean(errors.coverageAmount)}
                className={inputClass("coverageAmount")}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field
              id="rec-notes"
              label="Other policy details"
              hint="Plan type, vehicle details, waiting period, benefits — anything else about this policy."
            >
              <Textarea
                id="rec-notes"
                rows={4}
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                className="rounded-xl"
              />
            </Field>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Summary" icon={UserRound} className="self-start lg:col-span-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface/40 p-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Policy
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{policy.policyName}</p>
              <InsuranceTypeBadge type={policy.insuranceType} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg text-xs"
              onClick={onChangePolicy}
            >
              Change
            </Button>
          </div>

          {record.error != null && (
            <p
              role="alert"
              className="flex items-start gap-1.5 text-xs font-medium text-destructive"
            >
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              {errorText(record.error, "The sale could not be recorded.")}
            </p>
          )}

          <Button type="submit" disabled={record.isPending} className="h-11 w-full rounded-xl">
            {record.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            {record.isPending ? "Recording…" : "Record sold policy"}
          </Button>
        </div>
      </SectionCard>
    </form>
  );
}

function SaleSuccess({
  sale,
  adminMode,
  onRecordAnother,
  onViewLedger,
}: {
  sale: ApiSoldPolicyDetail;
  adminMode: boolean;
  onRecordAnother: () => void;
  onViewLedger?: (() => void) | undefined;
}) {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-border/80 bg-background p-6 text-center shadow-xs sm:p-10">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
        <CheckCircle2 className="size-8" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-foreground">
        Sold policy recorded
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {sale.policy.policyName} for {sale.customer.fullName}{" "}
        {adminMode
          ? `has been recorded under ${sale.agent.fullName}.`
          : "has been added to your sales."}
      </p>
      <dl className="mt-6 grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
        <DetailRow
          label="Policy number"
          value={<span className="font-mono">{sale.policyNumber}</span>}
        />
        <DetailRow label="Premium" value={formatINR(sale.premium, true)} />
        <DetailRow
          label="Cover"
          value={`${formatDate(sale.issueDate)} – ${formatDate(sale.expiryDate)}`}
        />
      </dl>
      <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        <Button className="rounded-xl" onClick={onRecordAnother}>
          <FilePlus2 /> Record another policy
        </Button>
        {adminMode ? (
          <Button variant="outline" className="rounded-xl" onClick={onViewLedger}>
            Sold policies <ArrowRight />
          </Button>
        ) : (
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/agent/sold-policies">
              Sold policies <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function RecordSoldPolicyPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/agent/sell-policy" });
  return (
    <RecordSoldPolicyFlow
      adminMode={false}
      presetPolicyId={params.policyId}
      renewal={params.renewal === true}
      onSearchChange={(policyId) =>
        void navigate({
          search: (prev) => ({ ...prev, policyId }),
          replace: true,
        })
      }
    />
  );
}

/**
 * The record-a-sale flow shared by the agent portal and the admin Sold Policies page. Admins
 * get an extra "Select agent" field and record on that agent's behalf.
 */
export function RecordSoldPolicyFlow({
  adminMode,
  presetPolicyId,
  renewal,
  onSearchChange,
  onViewLedger,
}: {
  adminMode: boolean;
  presetPolicyId?: string | undefined;
  renewal?: boolean;
  /** Keeps the page URL in step with the chosen policy (agent portal only). */
  onSearchChange?: (policyId: string | undefined) => void;
  onViewLedger?: () => void;
}) {
  const [policy, setPolicy] = useState<ApiPolicy | null>(null);
  const [sale, setSale] = useState<ApiSoldPolicyDetail | null>(null);
  // Held here so "Back to policy catalog" returns to what was picked.
  const [selection, setSelection] = useState<CatalogSelection>(emptySelection);
  const [renewalCustomer, setRenewalCustomer] = useState<ApiCustomer | null>(null);
  const [loadingRenewal, setLoadingRenewal] = useState(false);

  // Preselected from "Record sold policy" links on the policy catalog.
  const presetPolicy = useQuery({
    queryKey: agentKeys.policy(presetPolicyId ?? ""),
    queryFn: () => policiesApi.get(presetPolicyId!),
    enabled: Boolean(presetPolicyId) && !policy,
    retry: retryUnlessClientError,
  });
  const presetData = presetPolicy.data;
  if (presetData && !policy) setPolicy(presetData);

  const selectPolicy = (value: ApiPolicy | null) => {
    setPolicy(value);
    onSearchChange?.(value?.id);
  };

  // Fills the customer and their most recent policy; the agent may switch to an upgraded one.
  const pickRenewalCustomer = async (customer: ApiCustomer) => {
    setRenewalCustomer(customer);
    setLoadingRenewal(true);
    try {
      const last = await soldPoliciesApi.list({
        customerId: customer.id,
        limit: 1,
        sortBy: "issueDate",
        order: "desc",
      });
      const previous = last.data[0];
      if (!previous) {
        selectPolicy(null);
        toast.info(`${customer.fullName} has no earlier policy. Choose the policy to record.`);
        return;
      }
      const renewed = await policiesApi.get(previous.policy.id);
      setSelection({
        insurerId: renewed.insurerId,
        line: renewed.insuranceType,
        categoryId: "",
        subCategoryId: "",
        policyId: renewed.id,
      });
      selectPolicy(renewed);
    } catch (error) {
      toast.error(errorText(error, "The customer's earlier policy could not be loaded."));
    } finally {
      setLoadingRenewal(false);
    }
  };

  if (sale) {
    return (
      <SaleSuccess
        sale={sale}
        adminMode={adminMode}
        onViewLedger={onViewLedger}
        onRecordAnother={() => {
          setSale(null);
          setPolicy(null);
          setSelection(emptySelection);
          setRenewalCustomer(null);
          onSearchChange?.(undefined);
        }}
      />
    );
  }

  const loadingPreset = Boolean(presetPolicyId) && !policy && presetPolicy.isLoading;
  const step: 1 | 2 = policy ? 2 : 1;

  return (
    <>
      {renewal && (
        <RenewalPicker
          customer={renewalCustomer}
          onSelectCustomer={(customer) => void pickRenewalCustomer(customer)}
          busy={loadingRenewal}
        />
      )}

      <div className="rounded-xl border border-border/80 bg-background/90 p-3 shadow-xs sm:rounded-2xl sm:p-4">
        <Stepper step={step} />
      </div>

      {presetPolicy.error != null && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-800">
          The preselected policy isn't available ({errorText(presetPolicy.error)}). Please choose
          another.
        </p>
      )}

      {policy && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm">
          <span>
            Recording <span className="font-semibold text-foreground">{policy.policyName}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={() => selectPolicy(null)}
          >
            <ArrowLeft /> Back to policy catalog
          </Button>
        </div>
      )}

      {renewal && !renewalCustomer ? null : loadingPreset ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : step === 1 ? (
        <PolicyStep
          selection={selection}
          onSelectionChange={setSelection}
          onSelect={selectPolicy}
        />
      ) : (
        <SaleForm
          key={`${policy!.id}:${renewalCustomer?.id ?? ""}`}
          policy={policy!}
          renewalCustomer={renewalCustomer}
          adminMode={adminMode}
          onChangePolicy={() => selectPolicy(null)}
          onSold={setSale}
        />
      )}
    </>
  );
}
