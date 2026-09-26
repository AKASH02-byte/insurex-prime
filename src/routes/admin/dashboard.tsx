import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminKpiCards } from "@/components/admin/AdminKpiCards";
import { AdminFilters, type FilterState } from "@/components/admin/AdminFilters";
import { AdminAnalyticsCharts } from "@/components/admin/AdminAnalyticsCharts";
import { AdminQuickActions } from "@/components/admin/AdminQuickActions";
import { AdminPolicySummary } from "@/components/admin/AdminPolicySummary";
import { AdminAgentPerformanceTable } from "@/components/admin/AdminAgentPerformanceTable";
import { AdminRecentSalesTable } from "@/components/admin/AdminRecentSalesTable";
import { AdminExportModal } from "@/components/admin/AdminExportModal";
import { AdminActionModals, type ModalType } from "@/components/admin/AdminActionModals";
import {
  agentPerformanceList,
  initialKpiData,
  recentPolicySalesList,
  type AgentPerformanceRecord,
  type KpiStats,
  type RecentPolicySale,
} from "@/components/admin/admin-mock-data";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Super Admin Dashboard — InsureX Prime" },
      {
        name: "description",
        content:
          "Centralized insurance operations dashboard for Super Admins: enterprise analytics, policy ledger, agent production, and data export.",
      },
    ],
  }),
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search query
  const [searchQuery, setSearchQuery] = useState("");

  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Quick action modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Global operations filters
  const [filters, setFilters] = useState<FilterState>({
    dateRange: "All Time",
    policyType: "All",
    agent: "All",
    status: "All",
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: "All Time",
      policyType: "All",
      agent: "All",
      status: "All",
    });
    setSearchQuery("");
  };

  // Filtered recent policies
  const filteredPolicies: RecentPolicySale[] = useMemo(() => {
    return recentPolicySalesList.filter((item) => {
      // Policy Type filter
      if (filters.policyType !== "All" && item.policyType !== filters.policyType) {
        return false;
      }
      // Agent filter
      if (filters.agent !== "All" && item.agentName !== filters.agent) {
        return false;
      }
      // Status filter
      if (filters.status !== "All" && item.status !== filters.status) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          item.policyNumber.toLowerCase().includes(q) ||
          item.customerName.toLowerCase().includes(q) ||
          item.policyName.toLowerCase().includes(q) ||
          item.agentName.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [filters, searchQuery]);

  // Filtered agents
  const filteredAgents: AgentPerformanceRecord[] = useMemo(() => {
    return agentPerformanceList.filter((agent) => {
      if (filters.agent !== "All" && agent.name !== filters.agent) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          agent.name.toLowerCase().includes(q) ||
          agent.email.toLowerCase().includes(q) ||
          agent.code.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [filters.agent, searchQuery]);

  // Dynamically adjusted KPI metrics based on filter selection
  const dynamicKpiStats: KpiStats = useMemo(() => {
    if (filters.policyType === "Health") {
      return {
        totalPolicies: 724,
        policiesSold: 570,
        activePolicies: 512,
        totalPremium: 2980000,
        totalAgents: 20,
        policiesGrowth: "+14.2%",
        soldGrowth: "+15.6%",
        activeGrowth: "+8.9%",
        premiumGrowth: "+16.2%",
        agentsGrowth: "Health Wing",
      };
    }

    if (filters.policyType === "Motor") {
      return {
        totalPolicies: 524,
        policiesSold: 412,
        activePolicies: 344,
        totalPremium: 1885000,
        totalAgents: 18,
        policiesGrowth: "+9.8%",
        soldGrowth: "+10.4%",
        activeGrowth: "+4.1%",
        premiumGrowth: "+12.5%",
        agentsGrowth: "Motor Wing",
      };
    }

    if (filters.agent !== "All") {
      const selected = agentPerformanceList.find((a) => a.name === filters.agent);
      if (selected) {
        return {
          totalPolicies: selected.policiesSold,
          policiesSold: selected.policiesSold,
          activePolicies: Math.round(selected.policiesSold * 0.88),
          totalPremium: selected.premiumGenerated,
          totalAgents: 1,
          policiesGrowth: "+11.0%",
          soldGrowth: "+14.5%",
          activeGrowth: "+6.2%",
          premiumGrowth: "+13.1%",
          agentsGrowth: "Assigned Agent",
        };
      }
    }

    return initialKpiData;
  }, [filters.policyType, filters.agent]);

  return (
    <div className="min-h-screen bg-surface/30 text-foreground selection:bg-primary/20 selection:text-primary">
      <Toaster position="top-right" richColors />

      {/* Sidebar (Desktop Fixed + Mobile Drawer) */}
      <AdminSidebar
        currentPath="/admin/dashboard"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenExport={() => setExportModalOpen(true)}
      />

      {/* Main Wrapper (shifted left on desktop for fixed sidebar) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <AdminHeader
          onToggleSidebar={() => setSidebarOpen(true)}
          onOpenExport={() => setExportModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Dashboard Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Global Operations Filters */}
          <AdminFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {/* KPI Summary Cards */}
          <AdminKpiCards stats={dynamicKpiStats} />

          {/* Analytics Charts (Sales Overview & Distribution) */}
          <AdminAnalyticsCharts
            initialTimeframe={
              filters.dateRange === "7D"
                ? "7D"
                : filters.dateRange === "6M"
                  ? "6M"
                  : filters.dateRange === "1Y"
                    ? "1Y"
                    : "30D"
            }
          />

          {/* Quick Actions Shortcuts */}
          <AdminQuickActions
            onOpenAddAgent={() => setActiveModal("add_agent")}
            onOpenAddCustomer={() => setActiveModal("add_customer")}
            onOpenAddPolicy={() => setActiveModal("add_policy")}
            onOpenGenerateReport={() => setActiveModal("generate_report")}
            onOpenExport={() => setExportModalOpen(true)}
          />

          {/* Policy Summary Matrix */}
          <AdminPolicySummary />

          {/* Agent Performance Table */}
          <AdminAgentPerformanceTable agents={filteredAgents} />

          {/* Recent Policy Sales Table */}
          <AdminRecentSalesTable policies={filteredPolicies} />

          {/* Bottom Security / System Audit Footer */}
          <footer className="border-t border-border/80 pt-6 pb-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 InsureX Prime • Super Admin Enterprise Gateway v2.4.0</p>
            <div className="flex items-center gap-4 text-[11px]">
              <span>Audit Logging: Active</span>
              <span>•</span>
              <span>Data Protection: AES-256</span>
              <span>•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                ● All Underwriting Services Operational
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* Export Data Modal */}
      <AdminExportModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} />

      {/* Action Dialogs (Add Agent, Customer, Policy, Report) */}
      <AdminActionModals modalType={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
