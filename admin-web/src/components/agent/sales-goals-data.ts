import { useSyncExternalStore } from "react";

/**
 * Sales goals for the agent ("Sell 2 policies this week").
 *
 * UI-only for now: demo data held in memory. When the backend is ready, swap
 * `useSalesGoals` / `salesGoalsStore` for React Query calls — the shapes below are what
 * the Goals screen renders.
 */
export type GoalCadence = "weekly" | "monthly" | "quarterly" | "yearly";

export interface SalesGoal {
  cadence: GoalCadence;
  /** Free-text commitment, e.g. "Sell 2 policies this week". */
  title: string;
  /** Roadmap card title, e.g. "Monthly Quota". */
  label: string;
  targetPolicies: number;
  soldPolicies: number;
  targetPremium: number;
  closedPremium: number;
  /** Human period, e.g. "Oct 21 – Oct 27". */
  periodLabel: string;
  daysLeft: number;
  businessDaysLeft: number;
  /** Share of the period already elapsed (0–1), used for pacing. */
  elapsed: number;
}

export type LineGroup = "health" | "motor" | "group";
export type LineStage = "Sold" | "Pipeline" | "Quoted" | "Prospect";

export interface LineSegment {
  id: string;
  label: string;
  group: LineGroup;
  /** Premium attributed to this line in the period (sold + pipeline). */
  premium: number;
  stage: LineStage;
  sold: number;
  color: string;
  dot: string;
}

export interface FieldClosure {
  id: string;
  clientName: string;
  product: string;
  date: string;
  premium: number;
  /** Bound and paid (credited) or still quoted (potential). */
  state: "CREDITED" | "QUOTED";
  note: string;
}

export const cadenceLabel: Record<GoalCadence, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export const lineGroupLabel: Record<LineGroup, string> = {
  health: "Health",
  motor: "Motor",
  group: "Group & Business",
};

// ─── Period helpers ───────────────────────────────────────────────────────────
const DAY = 86_400_000;
const short = (date: Date) => date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function businessDaysBetween(from: Date, to: Date) {
  let count = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function period(cadence: GoalCadence, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let end: Date;
  if (cadence === "weekly") {
    const offset = (start.getDay() + 6) % 7; // Monday start
    start.setDate(start.getDate() - offset);
    end = new Date(start.getTime() + 6 * DAY);
  } else if (cadence === "monthly") {
    start.setDate(1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  } else if (cadence === "quarterly") {
    const quarter = Math.floor(start.getMonth() / 3);
    start.setMonth(quarter * 3, 1);
    end = new Date(start.getFullYear(), quarter * 3 + 3, 0);
  } else {
    start.setMonth(0, 1);
    end = new Date(start.getFullYear(), 11, 31);
  }
  const today = new Date(now).setHours(0, 0, 0, 0);
  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
  const daysLeft = Math.max(0, Math.round((end.getTime() - today) / DAY));
  return {
    periodLabel: `${short(start)} – ${short(end)}`,
    daysLeft,
    businessDaysLeft: businessDaysBetween(now, end),
    elapsed: Math.min(1, (totalDays - daysLeft) / totalDays),
  };
}

/** ISO week number, shown as "Week 43". */
export function isoWeek(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / DAY + 1) / 7);
}

export const quarterLabel = (date = new Date()) => `Q${Math.floor(date.getMonth() / 3) + 1}`;

// ─── Demo data ────────────────────────────────────────────────────────────────
const seedGoals = (): Record<GoalCadence, SalesGoal> => ({
  weekly: {
    cadence: "weekly",
    title: "Sell 2 policies this week",
    label: "Weekly Sprint",
    targetPolicies: 2,
    soldPolicies: 1,
    targetPremium: 60_000,
    closedPremium: 34_800,
    ...period("weekly"),
  },
  monthly: {
    cadence: "monthly",
    title: "Close 10 policies this month",
    label: "Monthly Quota",
    targetPolicies: 10,
    soldPolicies: 4,
    targetPremium: 3_00_000,
    closedPremium: 1_48_200,
    ...period("monthly"),
  },
  quarterly: {
    cadence: "quarterly",
    title: `Hit 25 policies in ${quarterLabel()}`,
    label: `${quarterLabel()} Horizon Target`,
    targetPolicies: 25,
    soldPolicies: 18,
    targetPremium: 7_20_000,
    closedPremium: 5_82_400,
    ...period("quarterly"),
  },
  yearly: {
    cadence: "yearly",
    title: "50 policies for President's Club",
    label: "Annual President's Club",
    targetPolicies: 50,
    soldPolicies: 36,
    targetPremium: 20_00_000,
    closedPremium: 14_12_000,
    ...period("yearly"),
  },
});

export const lineSegments: LineSegment[] = [
  {
    id: "family-health",
    label: "Family Health",
    group: "health",
    premium: 34_800,
    stage: "Sold",
    sold: 1,
    color: "#006194",
    dot: "bg-fo-primary",
  },
  {
    id: "motor",
    label: "Motor",
    group: "motor",
    premium: 23_200,
    stage: "Pipeline",
    sold: 0,
    color: "#a36700",
    dot: "bg-fo-tertiary-container",
  },
  {
    id: "group-health",
    label: "Group Health",
    group: "group",
    premium: 11_600,
    stage: "Quoted",
    sold: 0,
    color: "#007bb9",
    dot: "bg-fo-primary-container",
  },
  {
    id: "fleet",
    label: "Fleet / Commercial",
    group: "motor",
    premium: 7_700,
    stage: "Prospect",
    sold: 0,
    color: "#565e74",
    dot: "bg-fo-secondary",
  },
];

const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

export const fieldClosures: FieldClosure[] = [
  {
    id: "c-1",
    clientName: "Apex Dental Care",
    product: "Family Health Floater",
    date: daysAgo(0),
    premium: 34_800,
    state: "CREDITED",
    note: "Bound & Paid",
  },
  {
    id: "c-2",
    clientName: "Harbor Bistro & Grille",
    product: "Shop Motor & Liability",
    date: daysAgo(1),
    premium: 23_200,
    state: "QUOTED",
    note: "Sign-off Friday",
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────
type Listener = () => void;
let goals: Record<GoalCadence, SalesGoal> | null = null;
const listeners = new Set<Listener>();
const ensure = () => (goals ??= seedGoals());

export const salesGoalsStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => ensure(),
  update(cadence: GoalCadence, patch: Partial<SalesGoal>) {
    const current = ensure();
    goals = { ...current, [cadence]: { ...current[cadence], ...patch } };
    listeners.forEach((listener) => listener());
  },
};

const serverSnapshot = seedGoals();

export function useSalesGoals() {
  return useSyncExternalStore(
    salesGoalsStore.subscribe,
    salesGoalsStore.getSnapshot,
    () => serverSnapshot,
  );
}

export const percent = (value: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

export type Pace = "AHEAD" | "ON_TRACK" | "BEHIND" | "ACHIEVED";

/** Compares progress with how much of the period has gone by. */
export function paceOf(goal: SalesGoal): Pace {
  const progress = goal.targetPolicies ? goal.soldPolicies / goal.targetPolicies : 0;
  if (progress >= 1) return "ACHIEVED";
  if (progress >= goal.elapsed + 0.1) return "AHEAD";
  if (progress >= goal.elapsed - 0.15) return "ON_TRACK";
  return "BEHIND";
}

export const paceLabel: Record<Pace, string> = {
  AHEAD: "Ahead of Pace",
  ON_TRACK: "On Track",
  BEHIND: "Behind Pace",
  ACHIEVED: "Target Achieved",
};
