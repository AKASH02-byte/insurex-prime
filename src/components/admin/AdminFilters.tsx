import { Calendar, Filter, RotateCcw, Shield, Tag, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FilterState {
  dateRange: "All Time" | "7D" | "30D" | "6M" | "1Y";
  policyType: "All" | "Health" | "Motor";
  agent: string;
  status: "All" | "Active" | "Pending" | "In Review" | "Expired";
}

export interface AdminFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onReset: () => void;
}

export function AdminFilters({ filters, onFilterChange, onReset }: AdminFiltersProps) {
  const isFiltered =
    filters.dateRange !== "All Time" ||
    filters.policyType !== "All" ||
    filters.agent !== "All" ||
    filters.status !== "All";

  return (
    <div className="rounded-2xl border border-border/80 bg-background/80 p-4 shadow-xs backdrop-blur-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Label */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Filter className="size-3.5 text-primary" />
          <span>Global Operations Filter</span>
          {isFiltered && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              Active
            </span>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:flex lg:items-center lg:gap-3">
          {/* Date Range */}
          <div className="relative">
            <label htmlFor="filter-date-range" className="sr-only">
              Date Range
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
              <Calendar className="size-3.5" />
            </div>
            <select
              id="filter-date-range"
              aria-label="Filter by Date Range"
              value={filters.dateRange}
              onChange={(e) => onFilterChange("dateRange", e.target.value)}
              className="h-9 w-full appearance-none rounded-xl border border-border bg-surface/50 pl-8 pr-7 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All Time">Date: All Time</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="6M">Last 6 Months</option>
              <option value="1Y">Last 1 Year</option>
            </select>
          </div>

          {/* Policy Type */}
          <div className="relative">
            <label htmlFor="filter-policy-type" className="sr-only">
              Policy Type
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
              <Shield className="size-3.5" />
            </div>
            <select
              id="filter-policy-type"
              aria-label="Filter by Policy Type"
              value={filters.policyType}
              onChange={(e) => onFilterChange("policyType", e.target.value)}
              className="h-9 w-full appearance-none rounded-xl border border-border bg-surface/50 pl-8 pr-7 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">Type: All Policies</option>
              <option value="Health">Health Insurance</option>
              <option value="Motor">Motor Insurance</option>
            </select>
          </div>

          {/* Agent */}
          <div className="relative">
            <label htmlFor="filter-agent" className="sr-only">
              Agent
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
              <User className="size-3.5" />
            </div>
            <select
              id="filter-agent"
              aria-label="Filter by Agent"
              value={filters.agent}
              onChange={(e) => onFilterChange("agent", e.target.value)}
              className="h-9 w-full appearance-none rounded-xl border border-border bg-surface/50 pl-8 pr-7 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">Agent: All Field</option>
              <option value="Agent 01">Agent 01 (Rajesh V.)</option>
              <option value="Agent 02">Agent 02 (Priya S.)</option>
              <option value="Agent 03">Agent 03 (Amit K.)</option>
              <option value="Agent 04">Agent 04 (Sneha P.)</option>
              <option value="Agent 05">Agent 05 (Vikram M.)</option>
            </select>
          </div>

          {/* Policy Status */}
          <div className="relative">
            <label htmlFor="filter-status" className="sr-only">
              Policy Status
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
              <Tag className="size-3.5" />
            </div>
            <select
              id="filter-status"
              aria-label="Filter by Policy Status"
              value={filters.status}
              onChange={(e) => onFilterChange("status", e.target.value)}
              className="h-9 w-full appearance-none rounded-xl border border-border bg-surface/50 pl-8 pr-7 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">Status: All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="In Review">In Review</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted col-span-2 sm:col-span-4 lg:col-span-1 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
