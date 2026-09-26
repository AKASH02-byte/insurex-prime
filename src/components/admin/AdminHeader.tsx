import { Bell, CheckCircle2, Download, Menu, Search, Shield, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { adminNotificationsList, type AdminNotification } from "./admin-mock-data";

export interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  onOpenExport?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function AdminHeader({
  onToggleSidebar,
  onOpenExport,
  searchQuery = "",
  onSearchChange,
}: AdminHeaderProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>(adminNotificationsList);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    toast.success("All notifications marked as read");
  };

  return (
    <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-border/80 bg-background/80 px-4 sm:px-8 backdrop-blur-xl">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid size-10 place-items-center rounded-xl border border-border bg-background text-foreground hover:bg-muted lg:hidden cursor-pointer"
          aria-label="Open sidebar navigation"
        >
          <Menu className="size-5" />
        </button>

        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Super Admin Dashboard
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Overview of your insurance operations
          </p>
        </div>
      </div>

      {/* Right: Search, Export, Notifications, Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search policies, agents..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-9 w-full rounded-xl bg-surface/60 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Visible Export Button */}
        <Button
          type="button"
          onClick={onOpenExport}
          variant="outline"
          size="sm"
          className="h-9 rounded-xl border-border bg-background px-3 font-semibold text-xs shadow-xs hover:bg-muted cursor-pointer flex items-center gap-1.5"
        >
          <Download className="size-3.5 text-primary" />
          <span className="hidden sm:inline">Export</span>
        </Button>

        {/* Notification Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative grid size-9 place-items-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
              aria-label="Open notifications"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-signal text-[10px] font-bold text-signal-foreground ring-2 ring-background">
                  {unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 rounded-2xl shadow-nav border-border">
            <div className="flex items-center justify-between border-b border-border p-3.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-signal/20 px-2 py-0.5 text-[10px] font-bold text-foreground">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 text-xs transition-colors hover:bg-muted/40 ${
                    notif.unread ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{notif.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{notif.time}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                    {notif.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-2.5 text-center">
              <span className="text-[11px] text-muted-foreground">
                Automated insurance event audit stream
              </span>
            </div>
          </PopoverContent>
        </Popover>

        {/* Admin Profile & Avatar */}
        <div className="flex items-center gap-2 pl-1 border-l border-border/80">
          <div className="relative">
            <div className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-xs">
              SA
            </div>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-signal ring-2 ring-background" />
          </div>
          <div className="hidden xl:flex flex-col text-left leading-tight">
            <span className="font-display text-xs font-bold text-foreground">Rajesh Singhania</span>
            <span className="text-[11px] font-semibold text-primary">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
