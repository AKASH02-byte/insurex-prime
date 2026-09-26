import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Receipt } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useState } from "react";
import { requireAdminSession } from "@/lib/admin-route-guard";

export const Route = createFileRoute("/admin/receipts")({
  beforeLoad: requireAdminSession,
  head: () => ({
    meta: [{ title: "Premium Receipts — InsureX Prime" }],
  }),
  component: AdminReceiptsPage,
});

function AdminReceiptsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface/30 text-foreground">
      <AdminSidebar
        currentPath="/admin/receipts"
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
              Premium Receipts & Invoicing
            </h1>
            <p className="text-xs text-muted-foreground">
              Financial transaction proofs, GST invoices, and automated payment gateway
              reconciliations.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/90 p-8 text-center shadow-xs">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
              <Receipt className="size-7" />
            </div>
            <h3 className="font-display text-lg font-bold">Financial Receipts Repository</h3>
            <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto">
              Automated receipts and bank transfer confirmations are registered here. Total premium
              collected across active policies: ₹48,65,000.
            </p>
            <Link
              to="/admin/dashboard"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Return to Dashboard
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
