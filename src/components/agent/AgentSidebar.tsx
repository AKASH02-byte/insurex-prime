import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  FilePlus2,
  Flag,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldCheck,
  ShoppingBag,
  StickyNote,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { initialsOf } from "@/lib/format";
import { useAgentSession } from "./agent-session-context";

export const agentNavItems = [
  { label: "Dashboard", href: "/agent/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/agent/customers", icon: Users },
  { label: "Policies", href: "/agent/policies", icon: Shield },
  { label: "Record Sold Policy", href: "/agent/sell-policy", icon: FilePlus2 },
  { label: "Sold Policies", href: "/agent/sold-policies", icon: ShoppingBag },
  { label: "Field Notes", href: "/agent/notes", icon: StickyNote },
  { label: "Goals", href: "/agent/goals", icon: Flag },
  { label: "Profile", href: "/agent/profile", icon: UserRound },
] as const;

export interface AgentSidebarProps {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentSidebar({ currentPath, isOpen, onClose }: AgentSidebarProps) {
  const { agent, signOut } = useAgentSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const content = (
    <div className="flex h-full flex-col justify-between border-r border-border/80 bg-background text-foreground">
      <div className="min-h-0 overflow-y-auto">
        <div className="flex h-16 items-center justify-between border-b border-border/70 px-6">
          <Link
            to="/agent/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-extrabold leading-none tracking-tight">
                InsureX
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Agent Workspace
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Main Menu
          </p>
          <nav className="space-y-1" aria-label="Agent navigation">
            {agentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary font-semibold text-primary-foreground shadow-sm"
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

      <div className="border-t border-border/80 p-4">
        <Link
          to="/agent/profile"
          onClick={onClose}
          className="mb-3 flex items-center gap-3 rounded-xl border border-border/50 bg-surface/60 p-2.5 transition-colors hover:border-primary/30"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-2 ring-primary/20">
            {initialsOf(agent.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold leading-tight text-foreground">
              {agent.fullName}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {agent.agentCode}
            </p>
          </div>
          <span className="size-2 shrink-0 rounded-full bg-emerald-500" title="Active" />
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
        >
          <LogOut className="size-3.5" />
          <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden shadow-sm lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        {content}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-background shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
