import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminAnalyticsCharts } from "@/components/admin/AdminAnalyticsCharts";
import { useState } from "react";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [{ title: "Executive Reports — InsureX Prime" }],
  }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface/30 text-foreground">
      <AdminSidebar
        currentPath="/admin/reports"
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
              Executive Analytics & Reports
            </h1>
            <p className="text-xs text-muted-foreground">
              Deep-dive metrics across policy distribution, agent efficiency, and premium growth
              rates.
            </p>
          </div>

          <AdminAnalyticsCharts />
        </main>
      </div>
    </div>
  );
}
