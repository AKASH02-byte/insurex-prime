import { CheckCircle2, FileCheck2, IndianRupee, Shield, TrendingUp, Users } from "lucide-react";
import { formatINR, type KpiStats } from "./admin-mock-data";

export interface AdminKpiCardsProps {
  stats: KpiStats;
}

export function AdminKpiCards({ stats }: AdminKpiCardsProps) {
  const cards = [
    {
      id: "total-policies",
      label: "Total Policies",
      value: stats.totalPolicies.toLocaleString("en-IN"),
      growth: stats.policiesGrowth,
      isPositive: true,
      description: "Registered across catalog",
      icon: Shield,
      accentColor: "text-primary",
      bgAccent: "bg-primary/10",
    },
    {
      id: "policies-sold",
      label: "Policies Sold",
      value: stats.policiesSold.toLocaleString("en-IN"),
      growth: stats.soldGrowth,
      isPositive: true,
      description: "Successfully underwritten",
      icon: TrendingUp,
      accentColor: "text-signal-foreground",
      bgAccent: "bg-signal/30",
    },
    {
      id: "active-policies",
      label: "Active Policies",
      value: stats.activePolicies.toLocaleString("en-IN"),
      growth: stats.activeGrowth,
      isPositive: true,
      description: "In force & verified",
      icon: CheckCircle2,
      accentColor: "text-emerald-600 dark:text-emerald-400",
      bgAccent: "bg-emerald-500/10",
    },
    {
      id: "total-premium",
      label: "Total Premium",
      value: formatINR(stats.totalPremium),
      growth: stats.premiumGrowth,
      isPositive: true,
      description: "Gross written premium",
      icon: IndianRupee,
      accentColor: "text-primary",
      bgAccent: "bg-primary/10",
    },
    {
      id: "total-agents",
      label: "Total Agents",
      value: stats.totalAgents.toLocaleString("en-IN"),
      growth: stats.agentsGrowth,
      isPositive: true,
      description: "Certified field network",
      icon: Users,
      accentColor: "text-indigo-600 dark:text-indigo-400",
      bgAccent: "bg-indigo-500/10",
    },
  ];

  return (
    <section aria-label="Key Performance Indicators" className="w-full">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.id}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-background/90 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              {/* Header inside Card */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                <span
                  className={`grid size-9 place-items-center rounded-xl ${card.bgAccent} ${card.accentColor} transition-transform group-hover:scale-110`}
                >
                  <Icon className="size-4.5" />
                </span>
              </div>

              {/* Large Value */}
              <div className="mt-4">
                <p className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {card.value}
                </p>
              </div>

              {/* Growth & Description */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-400">
                  <TrendingUp className="size-3" />
                  {card.growth}
                </span>
                <span className="text-[11px] text-muted-foreground truncate pl-1">
                  {card.description}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
