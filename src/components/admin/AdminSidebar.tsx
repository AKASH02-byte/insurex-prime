import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Users,
  UsersRound,
  X,
} from "lucide-react";

export interface AdminSidebarProps {
  currentPath?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenExport?: () => void;
}

export function AdminSidebar({
  currentPath = "/admin/dashboard",
  isOpen = false,
  onClose,
  onOpenExport,
}: AdminSidebarProps) {
  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Agents", href: "/admin/agents", icon: UsersRound },
    { label: "Customers", href: "/admin/customers", icon: Users },
    { label: "Policies", href: "/admin/policies", icon: Shield },
    { label: "Sold Policies", href: "/admin/sold-policies", icon: ShoppingBag },
    { label: "Receipts", href: "/admin/receipts", icon: Receipt },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    {
      label: "Export",
      href: "#export",
      icon: FileSpreadsheet,
      isAction: true,
      onClick: () => {
        if (onOpenExport) onOpenExport();
        if (onClose) onClose();
      },
    },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const content = (
    <div className="flex h-full flex-col justify-between bg-background text-foreground border-r border-border/80">
      {/* Brand Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-6 border-b border-border/70">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-extrabold tracking-tight leading-none">
                InsureX
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Prime Admin
              </span>
            </div>
          </Link>

          {/* Mobile close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div className="px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Main Menu
          </p>
          <nav className="space-y-1" aria-label="Sidebar navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href;

              if (item.isAction) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer text-left"
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                  {isActive && <span className="ml-auto size-1.5 rounded-full bg-signal" />}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Profile & Logout */}
      <div className="border-t border-border/80 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface/60 p-2.5 border border-border/50">
          <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-2 ring-primary/20">
            SA
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground leading-tight">
              Rajesh Singhania
            </p>
            <p className="truncate text-[11px] text-muted-foreground">Super Admin</p>
          </div>
          <span className="size-2 rounded-full bg-signal shrink-0" title="Online" />
        </div>

        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
        >
          <LogOut className="size-3.5" />
          <span>Logout</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col shadow-sm">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full bg-background shadow-2xl transition-transform animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
