import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  customersApi,
  policiesApi,
  retryUnlessClientError,
  soldPoliciesApi,
  type ApiCustomer,
  type ApiPolicy,
  type ApiSoldPolicyDetail,
} from "@/lib/api";
import type { Gender, InsuranceType } from "@/lib/api/types";
import { agentKeys } from "@/lib/agent-queries";
import {
  formatDate,
  formatDuration,
  formatINR,
  paymentStatusLabel,
  premiumFrequencyLabel,
  shiftIsoDate,
  todayIso,
} from "@/lib/format";

interface SellSearch {
  policyId?: string | undefined;
}

const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);

export const Route = createFileRoute("/agent/sell-policy")({
  validateSearch: (raw: Record<string, unknown>): SellSearch => ({
    policyId: text(raw["policyId"]),
  }),
  head: () => ({ meta: [{ title: "Record Sold Policy — InsureX Prime" }] }),
  component: RecordSoldPolicyPage,
});

// Mirrors the backend's window for agent issue dates (it re-checks on submit).
const ISSUE_PAST_DAYS = 30;
const ISSUE_FUTURE_DAYS = 90;

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Policy catalog", "Customer details", "Policy details"];
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Progress">
      {steps.map((label, index) => {
        const number = (index + 1) as 1 | 2 | 3;
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
  dateOfBirth: string;
  gender: Gender | "";
  address: string;
  city: string;
  state: string;
}

const emptyCustomer: CustomerDraft = {
  fullName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  city: "",
  state: "",
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
  if (form.dateOfBirth && form.dateOfBirth > todayIso()) {
    errors.dateOfBirth = "Date of birth cannot be in the future.";
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
  if (form.dateOfBirth) input.dateOfBirth = form.dateOfBirth;
  if (form.gender) input.gender = form.gender;
  for (const key of ["address", "city", "state"] as const) {
    if (form[key].trim()) input[key] = form[key].trim();
  }
  return input;
}

function PolicyStep({ onSelect }: { onSelect: (policy: ApiPolicy) => void }) {
  const [search, setSearch] = useState("");
  const [insuranceType, setInsuranceType] = useState<InsuranceType | "">("");
  const debounced = useDebouncedValue(search.trim());
  const params = {
    limit: 12,
    search: debounced || undefined,
    insuranceType: insuranceType || undefined,
    sortBy: "policyName",
    order: "asc" as const,
  };
  const policies = useQuery({
    queryKey: agentKeys.policies(params),
    queryFn: () => policiesApi.list(params),
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });
  const rows = policies.data?.data ?? [];

  return (
    <SectionCard
      title="1. Active Policy Catalog"
      icon={Shield}
      description="Choose the type of policy you sold."
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search policy name or code"
            aria-label="Search policies"
            className="h-9 rounded-xl pl-9 text-xs"
          />
        </div>
        <NativeSelect
          value={insuranceType}
          onChange={(event) => setInsuranceType(event.target.value as InsuranceType | "")}
          aria-label="Insurance type"
        >
          <option value="">Health & Motor</option>
          <option value="HEALTH">Health</option>
          <option value="MOTOR">Motor</option>
        </NativeSelect>
      </div>
      {policies.isLoading && <Skeleton className="h-48 rounded-xl" />}
      {policies.error != null && !policies.data && (
        <ErrorState error={policies.error} onRetry={() => void policies.refetch()} />
      )}
      {policies.data && rows.length === 0 && (
        <EmptyState
          icon={Shield}
          title="No active policies found"
          description="Try another search or type."
        />
      )}
      {rows.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((policy) => (
            <li key={policy.id}>
              <button
                type="button"
                onClick={() => onSelect(policy)}
                className="flex h-full w-full cursor-pointer flex-col gap-2 rounded-xl border border-border/70 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex items-center justify-between gap-2">
                  <InsuranceTypeBadge type={policy.insuranceType} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {policy.policyCode}
                  </span>
                </span>
                <span className="text-sm font-bold text-foreground">{policy.policyName}</span>
                <span className="text-[11px] text-muted-foreground">
                  Cover {formatINR(policy.coverageAmount)} · {formatDuration(policy.durationMonths)}
                </span>
                <span className="mt-auto font-display text-lg font-extrabold text-foreground">
                  {formatINR(policy.premium)}{" "}
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {premiumFrequencyLabel[policy.premiumFrequency].toLowerCase()}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function CustomerStep({
  initial,
  onSubmit,
}: {
  initial: CustomerDraft;
  onSubmit: (customer: CustomerDraft) => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDraft, string>>>({});

  const set = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const inputClass = (key: keyof CustomerDraft) =>
    `h-10 rounded-xl ${errors[key] ? "border-destructive" : ""}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problems = validateCustomer(form);
    setErrors(problems);
    if (Object.keys(problems).length === 0) onSubmit(form);
  };

  return (
    <SectionCard
      title="2. Customer details"
      icon={UserRound}
      description="Type in the details of the customer you sold the policy to."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="rec-name" label="Full name" required error={errors.fullName}>
            <Input
              id="rec-name"
              autoFocus
              value={form.fullName}
              onChange={(event) => set("fullName", event.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              className={inputClass("fullName")}
            />
          </Field>
          <Field id="rec-phone" label="Phone" required error={errors.phone}>
            <Input
              id="rec-phone"
              type="tel"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              aria-invalid={Boolean(errors.phone)}
              className={inputClass("phone")}
            />
          </Field>
          <Field id="rec-email" label="Email" error={errors.email}>
            <Input
              id="rec-email"
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              className={inputClass("email")}
            />
          </Field>
          <Field id="rec-dob" label="Date of birth" error={errors.dateOfBirth}>
            <Input
              id="rec-dob"
              type="date"
              max={todayIso()}
              value={form.dateOfBirth}
              onChange={(event) => set("dateOfBirth", event.target.value)}
              aria-invalid={Boolean(errors.dateOfBirth)}
              className={inputClass("dateOfBirth")}
            />
          </Field>
          <Field id="rec-gender" label="Gender">
            <NativeSelect
              id="rec-gender"
              value={form.gender}
              onChange={(event) => set("gender", event.target.value as Gender | "")}
              className="h-10 w-full text-sm"
            >
              <option value="">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </NativeSelect>
          </Field>
          <Field id="rec-city" label="City">
            <Input
              id="rec-city"
              value={form.city}
              onChange={(event) => set("city", event.target.value)}
              className="h-10 rounded-xl"
            />
          </Field>
          <Field id="rec-state" label="State">
            <Input
              id="rec-state"
              value={form.state}
              onChange={(event) => set("state", event.target.value)}
              className="h-10 rounded-xl"
            />
          </Field>
        </div>
        <Field id="rec-address" label="Address">
          <Textarea
            id="rec-address"
            rows={2}
            value={form.address}
            onChange={(event) => set("address", event.target.value)}
            className="rounded-xl"
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" className="rounded-xl">
            Continue <ArrowRight />
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

type SalePaymentStatus = "PAID" | "PENDING" | "DUE";
const PAYMENT_STATUS_OPTIONS: SalePaymentStatus[] = ["PAID", "PENDING", "DUE"];

interface PolicyDraft {
  issueDate: string;
  expiryDate: string;
  premium: string;
  coverageAmount: string;
  paymentStatus: SalePaymentStatus | "";
  notes: string;
}

function PolicyDetailsStep({
  customer,
  policy,
  onChangeCustomer,
  onChangePolicy,
  onSold,
}: {
  customer: CustomerDraft;
  policy: ApiPolicy;
  onChangeCustomer: () => void;
  onChangePolicy: () => void;
  onSold: (sale: ApiSoldPolicyDetail) => void;
}) {
  const queryClient = useQueryClient();
  const today = todayIso();
  const minDate = shiftIsoDate(today, -ISSUE_PAST_DAYS);
  const maxDate = shiftIsoDate(today, ISSUE_FUTURE_DAYS);
  const [form, setForm] = useState<PolicyDraft>({
    issueDate: today,
    expiryDate: "",
    premium: "",
    coverageAmount: "",
    paymentStatus: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PolicyDraft, string>>>({});
  // Kept across retries so a failed sale never creates the same customer twice.
  const [savedCustomer, setSavedCustomer] = useState<ApiCustomer | null>(null);

  const set = <K extends keyof PolicyDraft>(key: K, value: PolicyDraft[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const record = useMutation({
    mutationFn: async () => {
      const owner = savedCustomer ?? (await customersApi.create(toCustomerInput(customer)));
      setSavedCustomer(owner);
      return soldPoliciesApi.create({
        policyId: policy.id,
        customerId: owner.id,
        issueDate: form.issueDate,
        paymentStatus: form.paymentStatus as SalePaymentStatus,
      });
    },
    onSuccess: async (sale) => {
      toast.success(`Policy ${sale.policyNumber} recorded for ${sale.customer.fullName}.`);
      await Promise.all(
        [agentKeys.dashboardAll, agentKeys.soldPoliciesAll, agentKeys.customersAll].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
      onSold(sale);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problems: typeof errors = {};
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.issueDate) ||
      form.issueDate < minDate ||
      form.issueDate > maxDate
    ) {
      problems.issueDate = `Choose a date between ${formatDate(minDate)} and ${formatDate(maxDate)}.`;
    }
    if (!form.expiryDate) problems.expiryDate = "Enter the expiry date.";
    else if (form.expiryDate <= form.issueDate)
      problems.expiryDate = "Must be after the issue date.";
    if (!(Number(form.premium) > 0)) problems.premium = "Enter the premium amount.";
    if (!(Number(form.coverageAmount) > 0)) problems.coverageAmount = "Enter the coverage amount.";
    if (!form.paymentStatus) problems.paymentStatus = "Select the payment status.";
    setErrors(problems);
    if (Object.keys(problems).length === 0) record.mutate();
  };

  const inputClass = (key: keyof PolicyDraft) =>
    `h-10 rounded-xl ${errors[key] ? "border-destructive" : ""}`;

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <SectionCard title="3. Policy details" icon={Shield} className="lg:col-span-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="rec-issue" label="Issue date" required error={errors.issueDate}>
            <Input
              id="rec-issue"
              type="date"
              min={minDate}
              max={maxDate}
              value={form.issueDate}
              onChange={(event) => set("issueDate", event.target.value)}
              aria-invalid={Boolean(errors.issueDate)}
              className={inputClass("issueDate")}
            />
          </Field>
          <Field id="rec-expiry" label="Expiry date" required error={errors.expiryDate}>
            <Input
              id="rec-expiry"
              type="date"
              min={form.issueDate}
              value={form.expiryDate}
              onChange={(event) => set("expiryDate", event.target.value)}
              aria-invalid={Boolean(errors.expiryDate)}
              className={inputClass("expiryDate")}
            />
          </Field>
          <Field id="rec-premium" label="Premium (₹)" required error={errors.premium}>
            <Input
              id="rec-premium"
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
            id="rec-coverage"
            label="Coverage amount (₹)"
            required
            error={errors.coverageAmount}
          >
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
          <Field id="rec-payment" label="Payment status" required error={errors.paymentStatus}>
            <NativeSelect
              id="rec-payment"
              value={form.paymentStatus}
              onChange={(event) =>
                set("paymentStatus", event.target.value as SalePaymentStatus | "")
              }
              aria-invalid={Boolean(errors.paymentStatus)}
              className={`h-10 w-full text-sm ${errors.paymentStatus ? "border-destructive" : ""}`}
            >
              <option value="">Select payment status</option>
              {PAYMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {paymentStatusLabel[status]}
                </option>
              ))}
            </NativeSelect>
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

      <SectionCard title="Summary" icon={UserRound} className="lg:col-span-2">
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
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface/40 p-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Customer
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{customer.fullName}</p>
              <p className="text-[11px] text-muted-foreground">{customer.phone}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg text-xs"
              onClick={onChangeCustomer}
            >
              Edit
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
  onRecordAnother,
}: {
  sale: ApiSoldPolicyDetail;
  onRecordAnother: () => void;
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
        {sale.policy.policyName} for {sale.customer.fullName} has been added to your sales.
      </p>
      <dl className="mt-6 grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
        <DetailRow
          label="Policy number"
          value={<span className="font-mono">{sale.policyNumber}</span>}
        />
        <DetailRow label="Premium" value={formatINR(sale.premium, true)} />
        <DetailRow label="Payment status" value={paymentStatusLabel[sale.paymentStatus]} />
        <DetailRow
          label="Cover"
          value={`${formatDate(sale.issueDate)} – ${formatDate(sale.expiryDate)}`}
        />
      </dl>
      <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        <Button className="rounded-xl" onClick={onRecordAnother}>
          <FilePlus2 /> Record another policy
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/agent/sold-policies">
            Sold policies <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function RecordSoldPolicyPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/agent/sell-policy" });
  const [policy, setPolicy] = useState<ApiPolicy | null>(null);
  const [customer, setCustomer] = useState<CustomerDraft | null>(null);
  // Survives "Edit" so going back doesn't wipe what the agent typed.
  const [draft, setDraft] = useState<CustomerDraft>(emptyCustomer);
  const [sale, setSale] = useState<ApiSoldPolicyDetail | null>(null);

  // Preselected from "Record sold policy" links on the policy catalog.
  const presetPolicy = useQuery({
    queryKey: agentKeys.policy(params.policyId ?? ""),
    queryFn: () => policiesApi.get(params.policyId!),
    enabled: Boolean(params.policyId) && !policy,
    retry: retryUnlessClientError,
  });
  const presetData = presetPolicy.data;
  if (presetData && !policy) setPolicy(presetData);

  const selectPolicy = (value: ApiPolicy | null) => {
    setPolicy(value);
    void navigate({ search: { policyId: value?.id }, replace: true });
  };

  if (sale) {
    return (
      <SaleSuccess
        sale={sale}
        onRecordAnother={() => {
          setSale(null);
          setCustomer(null);
          setDraft(emptyCustomer);
          setPolicy(null);
          void navigate({ search: {}, replace: true });
        }}
      />
    );
  }

  const loadingPreset = Boolean(params.policyId) && !policy && presetPolicy.isLoading;
  const step: 1 | 2 | 3 = !policy ? 1 : !customer ? 2 : 3;

  return (
    <>
      <div className="rounded-2xl border border-border/80 bg-background/90 p-4 shadow-xs">
        <Stepper step={step} />
      </div>

      {presetPolicy.error != null && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-800">
          The preselected policy isn't available ({errorText(presetPolicy.error)}). Please choose
          another.
        </p>
      )}

      {policy && step === 2 && (
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
            <ArrowLeft /> Change policy
          </Button>
        </div>
      )}

      {loadingPreset ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : step === 1 ? (
        <PolicyStep onSelect={selectPolicy} />
      ) : step === 2 ? (
        <CustomerStep
          initial={draft}
          onSubmit={(value) => {
            setDraft(value);
            setCustomer(value);
          }}
        />
      ) : (
        <PolicyDetailsStep
          customer={customer!}
          policy={policy!}
          onChangeCustomer={() => setCustomer(null)}
          onChangePolicy={() => selectPolicy(null)}
          onSold={setSale}
        />
      )}
    </>
  );
}
