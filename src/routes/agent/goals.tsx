import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlarmClockCheck,
  BadgeCheck,
  CalendarDays,
  ChartColumn,
  ChartPie,
  ClipboardList,
  FilePenLine,
  Flag,
  ListPlus,
  Medal,
  RefreshCw,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GoalDialog } from "@/components/agent/sales-goals/GoalDialog";
import {
  cadenceLabel,
  fieldClosures,
  isoWeek,
  lineGroupLabel,
  lineSegments,
  paceLabel,
  paceOf,
  percent,
  useSalesGoals,
  type GoalCadence,
  type LineGroup,
  type SalesGoal,
} from "@/components/agent/sales-goals-data";
import { formatINR, formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agent/goals")({
  head: () => ({ meta: [{ title: "Sales Goals — InsureX Prime" }] }),
  component: SalesGoalsPage,
});

const cadences: GoalCadence[] = ["weekly", "monthly", "quarterly", "yearly"];

const card = "flex min-w-0 flex-col rounded-xl bg-white shadow-sm ring-1 ring-fo-outline/30";

function SalesGoalsPage() {
  const goals = useSalesGoals();
  const [cadence, setCadence] = useState<GoalCadence>("weekly");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const goal = goals[cadence];
  const pace = paceOf(goal);

  const refresh = () => {
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      toast.success("Goal metrics are up to date");
    }, 700);
  };

  return (
    <div className="flex flex-col gap-4 font-fo-body text-fo-ink lg:gap-5">
      {/* Sub-header & pacing */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-fo-display text-xl font-bold tracking-tight lg:text-2xl">
              Sales Goals
            </h2>
            <p className="text-xs text-fo-muted">Target tracking &amp; field volume commitments</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-fo-high px-2.5 py-1 text-[11px] font-bold text-fo-primary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-fo-primary" />
              <span className="relative inline-flex size-1.5 rounded-full bg-fo-primary" />
            </span>
            Ledger Synced
          </span>
        </div>

        <div className={cn(card, "flex-row items-center justify-between gap-2 p-3")}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-fo-low text-fo-primary">
              <Zap className="size-4.5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    pace === "BEHIND" ? "text-fo-error" : "text-fo-ink",
                  )}
                >
                  Pacing: {paceLabel[pace]}
                </span>
                <span className="rounded-sm bg-fo-high px-1.5 py-0.5 text-[11px] font-bold text-fo-primary">
                  {cadence === "weekly"
                    ? `Week ${isoWeek()}`
                    : cadence === "monthly"
                      ? new Date().toLocaleDateString("en-IN", { month: "long" })
                      : cadence === "quarterly"
                        ? goal.label.split(" ")[0]
                        : new Date().getFullYear()}
                </span>
              </div>
              <p className="text-xs text-fo-muted tabular-nums">
                {goal.periodLabel} • {goal.businessDaysLeft} business day
                {goal.businessDaysLeft === 1 ? "" : "s"} remaining
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh metrics"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-fo-muted transition-colors hover:bg-fo-container"
          >
            <RefreshCw className={cn("size-5", syncing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Cadence switcher */}
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-fo-container p-1 lg:max-w-xl">
        {cadences.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCadence(value)}
            aria-pressed={cadence === value}
            className={cn(
              "h-9 cursor-pointer rounded-lg px-2 text-xs font-semibold transition-all",
              cadence === value
                ? "bg-white text-fo-primary shadow-sm"
                : "text-fo-muted hover:text-fo-ink",
            )}
          >
            {cadenceLabel[value]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <PrimaryGoalCard goal={goal} onEdit={() => setDialogOpen(true)} />

          {/* Target roadmap */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-fo-display text-lg font-semibold">Target Roadmap</h2>
              <Link
                to="/agent/sold-policies"
                className="text-xs font-semibold text-fo-primary hover:underline"
              >
                View Ledger
              </Link>
            </div>
            <div className="grid gap-2.5">
              {cadences
                .filter((value) => value !== cadence)
                .map((value) => (
                  <RoadmapCard key={value} goal={goals[value]} onSelect={() => setCadence(value)} />
                ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <LineBreakdownCard goal={goals.weekly} />
          <ClosuresCard onAddGoal={() => setDialogOpen(true)} />
        </div>
      </div>

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        goals={goals}
        cadence={cadence}
        onSaved={setCadence}
      />
    </div>
  );
}

function PrimaryGoalCard({ goal, onEdit }: { goal: SalesGoal; onEdit: () => void }) {
  const policyPct = percent(goal.soldPolicies, goal.targetPolicies);
  const premiumPct = percent(goal.closedPremium, goal.targetPremium);
  const remaining = Math.max(0, goal.targetPolicies - goal.soldPolicies);
  const ticks = goal.targetPolicies > 1 && goal.targetPolicies <= 12 ? goal.targetPolicies : 0;

  return (
    <div className={cn(card, "relative gap-3 overflow-hidden p-4 lg:p-5")}>
      <div className="absolute inset-x-0 top-0 h-1 bg-fo-primary" />
      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fo-primary">
              Active Commitment
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-fo-tertiary">
              <Flag className="size-3.5" /> Primary
            </span>
          </div>
          <p className="font-fo-display text-lg font-semibold">"{goal.title}"</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          title="Edit goal"
          aria-label="Edit goal"
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg bg-fo-low text-fo-primary transition-colors hover:bg-fo-container"
        >
          <FilePenLine className="size-4.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-fo-low p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-fo-display text-[26px] font-bold leading-8 text-fo-primary tabular-nums">
              {goal.soldPolicies}
            </span>
            <span className="text-sm text-fo-muted">
              / {goal.targetPolicies} {goal.targetPolicies === 1 ? "policy" : "policies"}
            </span>
          </div>
          <span className="rounded-full bg-fo-high px-2 py-0.5 text-xs font-semibold text-fo-primary">
            {policyPct}% Achieved
          </span>
        </div>
        <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-fo-container">
          <div
            className="h-full rounded-full bg-fo-primary transition-all duration-500"
            style={{ width: `${policyPct}%` }}
          />
          {Array.from({ length: Math.max(0, ticks - 1) }, (_, i) => (
            <div
              key={i}
              className="absolute inset-y-0 w-0.5 bg-white opacity-60"
              style={{ left: `${((i + 1) / ticks) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 pt-1 text-xs">
          <span className="text-fo-muted">Premium Volume</span>
          <span className="text-sm font-semibold tabular-nums">
            {formatINR(goal.closedPremium)}{" "}
            <span className="font-normal text-fo-muted">
              / {formatINR(goal.targetPremium)} ({premiumPct}%)
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-fo-secondary-container/50 px-3 py-2">
        <AlarmClockCheck className="size-4.5 shrink-0 text-fo-on-secondary-container" />
        <p className="text-xs text-fo-on-secondary-container">
          {remaining > 0 ? (
            <>
              <strong className="font-semibold">
                ⚡ {remaining} {remaining === 1 ? "policy" : "policies"} needed
              </strong>{" "}
              across the next {goal.daysLeft + 1} day{goal.daysLeft === 0 ? "" : "s"} to secure the
              quota bonus.
            </>
          ) : (
            <strong className="font-semibold">🎉 Goal achieved — quota bonus secured.</strong>
          )}
        </p>
      </div>
    </div>
  );
}

const roadmapIcon: Record<GoalCadence, [LucideIcon, string, string]> = {
  weekly: [CalendarDays, "text-fo-primary", "bg-fo-primary"],
  monthly: [CalendarDays, "text-fo-primary", "bg-fo-primary"],
  quarterly: [ChartColumn, "text-fo-primary-container", "bg-fo-primary-container"],
  yearly: [Medal, "text-fo-secondary", "bg-fo-secondary"],
};

function RoadmapCard({ goal, onSelect }: { goal: SalesGoal; onSelect: () => void }) {
  const [Icon, iconTone, barTone] = roadmapIcon[goal.cadence];
  const pct = percent(goal.soldPolicies, goal.targetPolicies);
  const pace = paceOf(goal);
  const remaining = Math.max(0, goal.targetPolicies - goal.soldPolicies);

  const badge =
    goal.cadence === "yearly" ? (
      <span className="rounded-full bg-fo-container px-2 py-0.5 text-[11px] font-bold text-fo-muted">
        Goal: {goal.targetPolicies} by Year-End
      </span>
    ) : pace === "AHEAD" || pace === "ACHIEVED" ? (
      <span className="rounded-full bg-fo-high px-2 py-0.5 text-[11px] font-bold text-fo-primary">
        ⚡ {paceLabel[pace]}
      </span>
    ) : (
      <span className="rounded-full bg-fo-container px-2 py-0.5 text-[11px] font-bold text-fo-muted">
        {goal.daysLeft} days left
      </span>
    );

  const footer =
    goal.cadence === "yearly" ? (
      <span className="font-medium text-fo-primary">
        {pct >= 70 ? "Tier II Unlocked" : pct >= 40 ? "Tier I Unlocked" : "Tier I at 40%"}
      </span>
    ) : goal.cadence === "quarterly" ? (
      <span className="font-medium text-fo-ink">Target: {formatINR(goal.targetPremium)}</span>
    ) : (
      <span className="font-medium text-fo-tertiary">
        {remaining > 0 ? `Needs ${remaining} more close${remaining === 1 ? "" : "s"}` : "Achieved"}
      </span>
    );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        card,
        "cursor-pointer gap-2 p-3.5 text-left transition-shadow hover:shadow-md active:scale-[0.99]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn("size-5 shrink-0", iconTone)} />
          <span className="truncate text-sm font-semibold">{goal.label}</span>
        </div>
        <span className="shrink-0">{badge}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-fo-display text-lg font-semibold tabular-nums">
          {goal.soldPolicies}{" "}
          <span className="font-fo-body text-sm font-normal text-fo-muted">
            / {goal.targetPolicies} Policies
          </span>
        </span>
        <span
          className={cn(
            "text-xs font-semibold",
            goal.cadence === "yearly" ? "text-fo-secondary" : "text-fo-primary",
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-fo-container">
        <div className={cn("h-full rounded-full", barTone)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-fo-muted">
        <span className="tabular-nums">{formatINR(goal.closedPremium)} closed</span>
        {footer}
      </div>
    </button>
  );
}

const R = 38;
const CIRCUMFERENCE = 2 * Math.PI * R;
const GAP = 2;

function LineBreakdownCard({ goal }: { goal: SalesGoal }) {
  const [group, setGroup] = useState<LineGroup | "all">("all");
  const total = lineSegments.reduce((sum, segment) => sum + segment.premium, 0);
  const active = (segmentGroup: LineGroup) => group === "all" || group === segmentGroup;
  const visible = lineSegments.filter((segment) => active(segment.group));
  const sold = visible.reduce((sum, segment) => sum + segment.sold, 0);
  const soldPremium = visible
    .filter((segment) => segment.stage === "Sold")
    .reduce((sum, segment) => sum + segment.premium, 0);

  let offset = 0;
  const arcs = lineSegments.map((segment) => {
    const length = (segment.premium / total) * CIRCUMFERENCE;
    const arc = { segment, length: Math.max(0, length - GAP), offset };
    offset += length;
    return arc;
  });

  const filters: [LineGroup | "all", string][] = [
    ["all", "All Lines"],
    ...(Object.entries(lineGroupLabel) as [LineGroup, string][]),
  ];

  return (
    <div className={cn(card, "gap-3 p-4 lg:p-5")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-fo-low text-fo-primary">
            <ChartPie className="size-4" />
          </span>
          <h2 className="font-fo-display text-lg font-semibold">Line Breakdown</h2>
        </div>
        <span className="text-[11px] font-bold text-fo-muted">
          {new Date().toLocaleDateString("en-IN", { month: "short" })} Ledger
        </span>
      </div>

      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setGroup(value)}
            aria-pressed={group === value}
            className={cn(
              "h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 text-[11px] font-bold transition-colors",
              group === value
                ? "bg-fo-primary text-white"
                : "bg-fo-container text-fo-muted hover:text-fo-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="relative size-44">
          <svg
            viewBox="0 0 100 100"
            className="size-full -rotate-90"
            role="img"
            aria-label="Policy line breakdown donut chart"
          >
            <circle cx="50" cy="50" r={R} fill="transparent" stroke="#eff4ff" strokeWidth="11" />
            {arcs.map(({ segment, length, offset: start }) => (
              <circle
                key={segment.id}
                cx="50"
                cy="50"
                r={R}
                fill="transparent"
                stroke={segment.color}
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${length} ${CIRCUMFERENCE}`}
                strokeDashoffset={-start}
                className="transition-opacity duration-300"
                opacity={active(segment.group) ? 1 : 0.15}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-fo-display text-xl font-bold leading-none">{sold} Sold</span>
            <span className="mt-0.5 text-sm font-semibold tabular-nums text-fo-primary">
              {formatINRCompact(soldPremium)}
            </span>
            <span className="text-[11px] font-bold text-fo-muted">
              {percent(goal.closedPremium, goal.targetPremium)}% Goal
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        {lineSegments.map((segment) => (
          <div
            key={segment.id}
            className={cn(
              "flex items-center gap-2 rounded-lg bg-fo-low p-2 transition-opacity",
              !active(segment.group) && "opacity-40",
            )}
          >
            <span className={cn("size-2.5 shrink-0 rounded-full", segment.dot)} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold">{segment.label}</span>
              <span className="truncate text-xs tabular-nums text-fo-muted">
                {Math.round((segment.premium / total) * 100)}% •{" "}
                {segment.stage === "Sold" ? formatINRCompact(segment.premium) : segment.stage}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosuresCard({ onAddGoal }: { onAddGoal: () => void }) {
  return (
    <div className={cn(card, "gap-3 p-4 lg:p-5")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-5 text-fo-primary" />
          <h2 className="font-fo-display text-lg font-semibold">Recent Field Closures</h2>
        </div>
        <span className="shrink-0 text-[11px] font-bold text-fo-muted">Auto-Credited</span>
      </div>

      <div className="flex flex-col gap-2">
        {fieldClosures.map((closure) => {
          const credited = closure.state === "CREDITED";
          return (
            <div
              key={closure.id}
              className="flex items-start justify-between gap-2 rounded-lg bg-fo-low p-3"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                    credited
                      ? "bg-fo-primary/10 text-fo-primary"
                      : "bg-fo-tertiary-container/10 text-fo-tertiary-container",
                  )}
                >
                  {credited ? (
                    <BadgeCheck className="size-4.5" />
                  ) : (
                    <ClipboardList className="size-4.5" />
                  )}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{closure.clientName}</span>
                  <span className="text-xs text-fo-muted">
                    {closure.product} •{" "}
                    {credited
                      ? new Date(closure.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      : "Pending"}
                  </span>
                  <span
                    className={cn(
                      "mt-1 w-fit rounded-sm px-1.5 py-0.5 text-[11px] font-bold",
                      credited
                        ? "bg-fo-high text-fo-primary"
                        : "bg-fo-secondary-container text-fo-on-secondary-container",
                    )}
                  >
                    {credited ? "+1 Policy Credited" : "+1 Potential (Quoted)"}
                  </span>
                </div>
              </div>
              <div className="shrink-0 pl-2 text-right">
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    credited ? "text-fo-primary" : "text-fo-tertiary",
                  )}
                >
                  {credited ? "+" : "Est. "}
                  {formatINR(closure.premium)}
                </span>
                <span className="block text-[11px] font-bold text-fo-muted">{closure.note}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddGoal}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-fo-high px-4 text-sm font-semibold text-fo-primary transition-colors hover:bg-fo-highest active:scale-[0.98]"
      >
        <ListPlus className="size-5" /> Add New Goal / Adjust Target
      </button>
    </div>
  );
}
