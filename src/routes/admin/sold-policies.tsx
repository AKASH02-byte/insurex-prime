import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminRecentSalesTable } from "@/components/admin/AdminRecentSalesTable";
import { useState } from "react";
import { isApiConfigured } from "@/lib/api";
import { useAdminSoldPolicies } from "@/hooks/use-admin-live-data";
import { recentPolicySalesList } from "@/components/admin/admin-mock-data";
import { requireAdminSession } from "@/lib/admin-route-guard";

export const Route = createFileRoute("/admin/sold-policies")({
  beforeLoad: requireAdminSession,
  head: () => ({
    meta: [{ title: "Sold Policies Audit — InsureX Prime" }],
  }),
  component: AdminSoldPoliciesPage,
});

function AdminSoldPoliciesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { query, sales } = useAdminSoldPolicies({ limit: 50, sortBy: "createdAt", order: "desc" });

  return (
    <div className="min-h-screen bg-surface/30 text-foreground">
      <AdminSidebar
        currentPath="/admin/sold-policies"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <AdminHeader onToggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <div>
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="size-3.5" /> Back to Dashboard
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Sold Policies Ledger
            </h1>
            <p className="text-xs text-muted-foreground">
              Audit trail of all underwritten policies sold by field agents and online channels.
            </p>
          </div>

          {isApiConfigured && query.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Couldn't load sold policies. Retrying automatically.
            </p>
          ) : null}
          <AdminRecentSalesTable
            policies={isApiConfigured ? (sales ?? []) : recentPolicySalesList}
          />
        </main>
      </div>
    </div>
  );
}
