import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarClock, Flag, StickyNote, Table2, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavItem {
  label: string;
  icon: LucideIcon;
  to: "/agent/notes" | "/agent/goals" | "/agent/customers";
  search?: { view?: "table"; due?: "soon" };
  isActive: (path: string, search: Record<string, unknown>) => boolean;
}

const onNotes = (path: string) => path === "/agent/notes";

const items: MobileNavItem[] = [
  {
    label: "Sticky Board",
    icon: StickyNote,
    to: "/agent/notes",
    isActive: (path, search) => onNotes(path) && search["view"] !== "table",
  },
  {
    label: "Table View",
    icon: Table2,
    to: "/agent/notes",
    search: { view: "table" },
    isActive: (path, search) =>
      onNotes(path) && search["view"] === "table" && search["due"] !== "soon",
  },
  {
    label: "Goals",
    icon: Flag,
    to: "/agent/goals",
    isActive: (path) => path === "/agent/goals",
  },
  {
    label: "Follow-ups",
    icon: CalendarClock,
    to: "/agent/notes",
    search: { view: "table", due: "soon" },
    isActive: (path, search) => onNotes(path) && search["due"] === "soon",
  },
  {
    label: "Clients",
    icon: Users,
    to: "/agent/customers",
    isActive: (path) => path.startsWith("/agent/customers"),
  },
];

/** App-style bottom tab bar for phones; the sidebar takes over from `lg` up. */
export function AgentMobileNav() {
  const { pathname, search } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.search as Record<string, unknown>,
    }),
  });

  return (
    <nav
      aria-label="Agent quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 bg-fo-surface/90 pb-[env(safe-area-inset-bottom)] font-fo-body shadow-[0_-1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(pathname, search);
          return (
            <Link
              key={item.label}
              to={item.to}
              search={item.search ?? {}}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 min-w-14 flex-col items-center justify-center transition-colors",
                active ? "font-bold text-fo-primary" : "text-fo-muted",
              )}
            >
              <Icon className="size-5.5" strokeWidth={active ? 2.4 : 2} />
              <span className="mt-0.5 text-[10px] font-bold leading-3">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
