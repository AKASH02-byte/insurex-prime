import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Settings, Shield } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useState } from "react";
import { requireAdminSession } from "@/lib/admin-route-guard";

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: requireAdminSession,
  head: () => ({
    meta: [{ title: "System Settings — InsureX Prime" }],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface/30 text-foreground">
      <AdminSidebar
        currentPath="/admin/settings"
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
              Enterprise Portal Settings
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure system parameters, role permissions, underwriting thresholds, and
              integration APIs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/80 bg-background/90 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="size-5 text-primary" />
                <h3 className="font-display text-sm font-bold">Security & Compliance</h3>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-signal" />
                  <span>Two-Factor Authentication: Enabled for Super Admin</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-signal" />
                  <span>Audit Logging: Active (90-day retention)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-signal" />
                  <span>Session Expiry: 60 minutes of inactivity</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/80 bg-background/90 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="size-5 text-primary" />
                <h3 className="font-display text-sm font-bold">Platform Configuration</h3>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Currency: INR (₹)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Environment: InsureX Prime v2.4 Enterprise</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Data Residency: Mumbai, India (AWS ap-south-1)</span>
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
