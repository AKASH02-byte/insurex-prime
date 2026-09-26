import { Link, useNavigate } from "@tanstack/react-router";
import {
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  PlusCircle,
  ShieldPlus,
  ShoppingBag,
  UserPlus,
  Users,
} from "lucide-react";

export interface AdminQuickActionsProps {
  onOpenAddAgent?: () => void;
  onOpenAddCustomer?: () => void;
  onOpenAddPolicy?: () => void;
  onOpenGenerateReport?: () => void;
  onOpenExport?: () => void;
}

export function AdminQuickActions({
  onOpenAddAgent,
  onOpenAddCustomer,
  onOpenAddPolicy,
  onOpenGenerateReport,
  onOpenExport,
}: AdminQuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      id: "add-agent",
      label: "Add Agent",
      description: "Onboard new certified agent",
      icon: UserPlus,
      color: "text-primary",
      bg: "bg-primary/10 hover:bg-primary/20",
      onClick: onOpenAddAgent,
    },
    {
      id: "add-customer",
      label: "Add Customer",
      description: "Register prospective policyholder",
      icon: Users,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 hover:bg-indigo-500/20",
      onClick: onOpenAddCustomer,
    },
    {
      id: "add-policy",
      label: "Add Policy",
      description: "Define new coverage product",
      icon: ShieldPlus,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
      onClick: onOpenAddPolicy,
    },
    {
      id: "view-sold",
      label: "View Sold Policies",
      description: "Audit completed bindings",
      icon: ShoppingBag,
      color: "text-signal-foreground",
      bg: "bg-signal/30 hover:bg-signal/40",
      onClick: () => navigate({ to: "/admin/sold-policies" }),
    },
    {
      id: "generate-report",
      label: "Generate Report",
      description: "Compile executive summary",
      icon: FileText,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 hover:bg-amber-500/20",
      onClick: onOpenGenerateReport,
    },
    {
      id: "export-data",
      label: "Export Data",
      description: "Download CSV, Excel, or PDF",
      icon: Download,
      color: "text-primary",
      bg: "bg-primary/10 hover:bg-primary/20",
      onClick: onOpenExport,
    },
  ];

  return (
    <section aria-label="Quick Actions" className="w-full">
      <div className="rounded-2xl border border-border/80 bg-background/90 p-5 shadow-xs backdrop-blur-sm">
        {/* Header */}
        <div className="border-b border-border/60 pb-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            Quick Actions
          </h2>
          <p className="text-xs text-muted-foreground">
            Direct shortcuts for underwriting, field management, and administrative workflows
          </p>
        </div>

        {/* Action Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={act.onClick}
                className="group flex flex-col items-center justify-center rounded-xl border border-border/70 bg-surface/40 p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-surface/80 hover:shadow-sm cursor-pointer"
              >
                <span
                  className={`grid size-11 place-items-center rounded-xl ${act.bg} ${act.color} transition-transform group-hover:scale-110 mb-2.5`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="font-display text-xs font-bold text-foreground leading-tight">
                  + {act.label}
                </span>
                <span className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                  {act.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
