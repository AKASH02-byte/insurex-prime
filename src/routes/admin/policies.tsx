import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminRecentSalesTable } from "@/components/admin/AdminRecentSalesTable";
import { AdminPolicySummary } from "@/components/admin/AdminPolicySummary";
import { useState } from "react";

export const Route = createFileRoute("/admin/policies")({
  head: () => ({
    meta: [{ title: "Insurance Policies Catalog — InsureX Prime" }],
  }),
  component: AdminPoliciesPage,
});

function AdminPoliciesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface/30 text-foreground">
      <AdminSidebar
        currentPath="/admin/policies"
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
              Insurance Policies Ledger
            </h1>
            <p className="text-xs text-muted-foreground">
              Master catalog of health, motor, and specialty underwriting products and active
              bounds.
            </p>
          </div>

          <AdminPolicySummary />
          <AdminRecentSalesTable />
        </main>
      </div>
    </div>
  );
}
