import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Eye,
  FilePlus2,
  IndianRupee,
  Shield,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import {
  PolicyDistributionChart,
  SalesOverviewChart,
} from "@/components/agent/AgentDashboardCharts";
import { SoldPolicyDialog } from "@/components/agent/SoldPolicyDialog";
import { useAgentSession } from "@/components/agent/agent-session-context";
import {
  CodeChip,
  CustomerStatusBadge,
  EmptyState,
  ErrorState,
  InsuranceTypeBadge,
  PolicyStatusBadge,
  SectionCard,
  TableScroller,
  tdClass,
  thClass,
} from "@/components/agent/agent-ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { agentApi, retryUnlessClientError, type AgentDashboard } from "@/lib/api";
import type { AgentDashboardRange } from "@/lib/api/types";
import { agentKeys } from "@/lib/agent-queries";
import { daysUntil, formatDate, formatINR, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/agent/dashboard")({
  head: () => ({ meta: [{ title: "Agent Dashboard — InsureX Prime" }] }),
  component: AgentDashboardPage,
});

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <article className="group min-w-0 rounded-2xl border border-border/80 bg-background/90 p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-110 ${accent}`}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 truncate font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.7rem]">
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>
    </article>
  );
}

function KpiGrid({ summary }: { summary: AgentDashboard["summary"] }) {
  const cards = [
    {
      label: "My Customers",
      value: formatNumber(summary.customers),
      hint: "Assigned to you",
      icon: Users,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Policies Sold",
      value: formatNumber(summary.policiesSold),
      hint: "Excluding cancelled",
      icon: ShoppingBag,
      accent: "bg-signal/30 text-signal-foreground",
    },
    {
      label: "Active Policies",
      value: formatNumber(summary.activePolicies),
      hint: "In force today",
      icon: CheckCircle2,
      accent: "bg-emerald-500/10 text-emerald-700",
    },
    {
      label: "Total Premium",
      value: formatINR(summary.totalPremium),
      hint: `${formatINR(summary.premiumCollected)} collected`,
      icon: IndianRupee,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Pending Payments",
      value: formatNumber(summary.pendingPayments),
      hint: "Sales awaiting payment",
      icon: Wallet,
      accent: "bg-amber-500/15 text-amber-700",
    },
    {
      label: "Expiring Soon",
      value: formatNumber(summary.expiringSoon),
      hint: "Within 30 days",
      icon: CalendarClock,
      accent: "bg-teal-500/15 text-teal-700",
    },
  ];
  return (
    <section
      aria-label="Key figures"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6"
    >
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </section>
  );
}

function QuickActions() {
  const actions = [
    {
      label: "Add Customer",
      description: "Register a new policyholder",
      icon: UserPlus,
      to: "/agent/customers" as const,
      search: { action: "add" as const },
      primary: true,
    },
    {
      label: "Record Sold Policy",
      description: "Log a policy you sold offline",
      icon: FilePlus2,
      to: "/agent/sell-policy" as const,
      primary: true,
    },
    {
      label: "View Customers",
      description: "Your customer book",
      icon: Users,
      to: "/agent/customers" as const,
    },
    {
      label: "View Policies",
      description: "Active catalog",
      icon: Shield,
      to: "/agent/policies" as const,
    },
  ];
  return (
    <SectionCard title="Quick Actions" icon={Zap} description="Jump straight into common tasks">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              {...("search" in action ? { search: action.search } : {})}
              className={`group flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                action.primary
                  ? "border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/10"
                  : "border-border/70 hover:border-primary/30 hover:bg-muted/40"
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                  action.primary ? "bg-primary text-primary-foreground" : "bg-surface text-primary"
                }`}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {action.primary ? `+ ${action.label}` : action.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {action.description}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

const EXPIRY_WARNING_DAYS = 30;

/** Red "(18 days)" only while cover ends in fewer than 30 days; otherwise nothing. */
function DaysRemaining({ expiryDate }: { expiryDate: string }) {
  const days = daysUntil(expiryDate);
  if (days < 0 || days >= EXPIRY_WARNING_DAYS) return null;
  return (
    <span className="font-bold text-destructive">
      {" "}
      ({days === 0 ? "today" : `${days} ${days === 1 ? "day" : "days"}`})
    </span>
  );
}

function RecentSales({
  sales,
  onView,
}: {
  sales: AgentDashboard["recentSales"];
  onView: (id: string) => void;
}) {
  return (
    <SectionCard
      title="Recent Policy Sales"
      icon={ShieldCheck}
      description="Your latest policy sales"
      actions={
        <Link
          to="/agent/sold-policies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80"
        >
          View all sales <ArrowRight className="size-3.5" />
        </Link>
      }
    >
      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No policies recorded yet"
          description="Record your first offline sale — it will show up here straight away."
          action={
            <Button asChild className="rounded-xl">
              <Link to="/agent/sell-policy">
                <FilePlus2 /> Record your first sold policy
              </Link>
            </Button>
          }
        />
      ) : (
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
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className={`${thClass} ${heading === "Premium" ? "text-right" : ""} ${heading === "Actions" ? "text-right" : ""}`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 font-medium">
            {sales.map((sale) => (
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
                <td className={`${tdClass} text-foreground`}>{sale.policy.policyName}</td>
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
                  <DaysRemaining expiryDate={sale.expiryDate} />
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
                      onClick={() => onView(sale.id)}
                    >
                      <Eye /> View
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableScroller>
      )}
    </SectionCard>
  );
}

function RecentCustomers({ customers }: { customers: AgentDashboard["recentCustomers"] }) {
  return (
    <SectionCard
      title="My Customers"
      icon={Users}
      description="Customers you added most recently"
      actions={
        <Button asChild size="sm" variant="outline" className="h-8 rounded-lg text-xs">
          <Link to="/agent/customers">View All Customers</Link>
        </Button>
      }
    >
      {customers.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No customers yet"
          description="Add your first customer to start recording sold policies."
          action={
            <Button asChild className="rounded-xl">
              <Link to="/agent/customers" search={{ action: "add" }}>
                <UserPlus /> Add your first customer
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                to="/agent/customers"
                search={{ view: customer.id }}
                className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {customer.fullName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {customer.fullName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    <span className="font-mono">{customer.customerCode}</span> ·{" "}
                    {customer.policiesCount} {customer.policiesCount === 1 ? "policy" : "policies"}
                    {customer.lastPolicy
                      ? ` · Last: ${customer.lastPolicy.policyName} (${formatDate(customer.lastPolicy.issueDate)})`
                      : " · No policy yet"}
                  </p>
                </div>
                <CustomerStatusBadge status={customer.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[120px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

function AgentDashboardPage() {
  const { agent } = useAgentSession();
  const navigate = useNavigate();
  const [range, setRange] = useState<AgentDashboardRange>("30D");
  const [viewSaleId, setViewSaleId] = useState<string | null>(null);

  const dashboard = useQuery({
    queryKey: agentKeys.dashboard(range),
    queryFn: () => agentApi.dashboard(range),
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });

  const data = dashboard.data;
  const firstName = agent.fullName.split(" ")[0];

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {agent.agentCode}
          </p>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Welcome back, {firstName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Here's how your insurance book is performing.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link to="/agent/sell-policy">
            <FilePlus2 /> Record sold policy
          </Link>
        </Button>
      </div>

      {dashboard.isLoading && <DashboardSkeleton />}
      {dashboard.error != null && !data && (
        <ErrorState
          error={dashboard.error}
          title="We couldn't load your dashboard"
          onRetry={() => void dashboard.refetch()}
        />
      )}

      {data && (
        <>
          <KpiGrid summary={data.summary} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SalesOverviewChart
              trend={data.salesTrend}
              range={range}
              onRangeChange={setRange}
              isFetching={dashboard.isFetching}
            />
            <PolicyDistributionChart distribution={data.policyDistribution} />
          </div>

          <RecentSales sales={data.recentSales} onView={setViewSaleId} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentCustomers customers={data.recentCustomers} />
            </div>
            <QuickActions />
          </div>
        </>
      )}

      <SoldPolicyDialog soldPolicyId={viewSaleId} onClose={() => setViewSaleId(null)} />
    </>
  );
}
