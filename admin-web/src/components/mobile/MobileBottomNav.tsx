import { Link } from "@tanstack/react-router";
import { LogOut, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface MobileNavItem {
  label: string;
  /** Route to open; omit for an action item that only has `onClick`. */
  href?: string;
  icon: LucideIcon;
  onClick?: () => void;
  /** Extra paths that keep this item highlighted (e.g. a child page). */
  alsoActiveFor?: string[];
}

export interface MobileBottomNavProps {
  currentPath: string;
  /** Up to four items that sit in the bar; "More" is always added as the fifth. */
  primary: MobileNavItem[];
  more?: MobileNavItem[];
  /** Name and role shown at the top of the More sheet. */
  account: { name: string; role: string };
  onLogout: () => void;
  isLoggingOut?: boolean;
}

const isActive = (item: MobileNavItem, path: string) =>
  Boolean(
    item.href &&
    (path === item.href ||
      path.startsWith(`${item.href}/`) ||
      item.alsoActiveFor?.some((extra) => path === extra || path.startsWith(`${extra}/`))),
  );

/** Phone-only bottom tab bar with a "More" sheet for everything that does not fit. */
export function MobileBottomNav({
  currentPath,
  primary,
  more = [],
  account,
  onLogout,
  isLoggingOut,
}: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = more.some((item) => isActive(item, currentPath));

  const tabClass = (active: boolean) =>
    cn(
      "flex h-12 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
      active ? "font-bold text-primary" : "text-muted-foreground",
    );
  const pill = (active: boolean) =>
    cn(
      "grid h-6 w-12 place-items-center rounded-full transition-colors",
      active && "bg-primary/10",
    );

  return (
    <>
      <nav
        aria-label="Primary"
        className="mobile-chrome fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(11,28,48,0.05)] backdrop-blur-xl lg:hidden"
      >
        <div className="flex h-16 items-center justify-around gap-1 px-2">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item, currentPath);
            const body = (
              <>
                <span className={pill(active)}>
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </>
            );
            return item.href ? (
              <Link
                key={item.label}
                to={item.href}
                aria-current={active ? "page" : undefined}
                className={tabClass(active)}
              >
                {body}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={tabClass(false)}
              >
                {body}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={tabClass(moreActive)}
          >
            <span className={pill(moreActive)}>
              <MoreHorizontal className="size-5" strokeWidth={moreActive ? 2.4 : 2} />
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="mobile-chrome max-h-[85vh] rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 lg:hidden"
        >
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" aria-hidden="true" />
          <SheetTitle className="sr-only">More</SheetTitle>
          <SheetDescription className="sr-only">Other pages and your account.</SheetDescription>
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface/60 p-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {account.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">{account.name}</p>
              <p className="truncate text-xs text-muted-foreground">{account.role}</p>
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
            <span className="text-sm font-semibold">Dark mode</span>
            <ThemeToggle />
          </div>
          {more.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {more.map((item) => {
                const Icon = item.icon;
                const active = isActive(item, currentPath);
                const cls = cn(
                  "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-[11px] font-semibold transition-colors",
                  active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/70 bg-background text-foreground active:bg-muted",
                );
                const body = (
                  <>
                    <Icon className="size-5" />
                    <span className="leading-tight">{item.label}</span>
                  </>
                );
                return item.href ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cls}
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      item.onClick?.();
                    }}
                    className={cls}
                  >
                    {body}
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 text-sm font-semibold text-destructive disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {isLoggingOut ? "Logging out…" : "Logout"}
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
