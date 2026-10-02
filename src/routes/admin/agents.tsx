import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  HeartPulse,
  IndianRupee,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldOff,
  Star,
  Table,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminExportModal } from "@/components/admin/AdminExportModal";
import { requireAdminSession } from "@/lib/admin-route-guard";
import { formatINR } from "@/components/admin/admin-mock-data";
import {
  agentKpiData,
  agentPoliciesChartData,
  agentsFullList,
  type AgentFull,
} from "@/components/admin/agents-mock-data";

export const Route = createFileRoute("/admin/agents")({
  beforeLoad: requireAdminSession,
  head: () => ({
    meta: [
      { title: "Agents Directory — InsureX Prime" },
      {
        name: "description",
        content: "Manage and monitor all InsureX certified insurance agents.",
      },
    ],
  }),
  component: AdminAgentsPage,
});

// ─── Utility ──────────────────────────────────────────────────────────────────
type SortField = "policiesSold" | "premiumGenerated" | "joinDate";
type SortDir = "asc" | "desc";

const STATUS_COLORS = {
  Active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  Inactive: "bg-destructive/10 text-destructive border-destructive/20",
};

const SPEC_COLORS = {
  Health: "bg-primary/10 text-primary border-primary/20",
  Motor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  Both: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgentKpiCards({ stats }: { stats: typeof agentKpiData }) {
  const cards = [
    {
      id: "total",
      label: "Total Agents",
      value: stats.totalAgents,
      growth: stats.agentsGrowth,
      icon: Users,
      bg: "bg-primary/10",
      color: "text-primary",
    },
    {
      id: "active",
      label: "Active Agents",
      value: stats.activeAgents,
      growth: stats.activeGrowth,
      icon: UserCheck,
      bg: "bg-emerald-500/10",
      color: "text-emerald-700 dark:text-emerald-400",
    },
    {
      id: "inactive",
      label: "Inactive Agents",
      value: stats.inactiveAgents,
      growth: stats.inactiveGrowth,
      icon: UserMinus,
      bg: "bg-destructive/10",
      color: "text-destructive",
    },
    {
      id: "sold",
      label: "Total Policies Sold",
      value: stats.totalPoliciesSold,
      growth: stats.soldGrowth,
      icon: TrendingUp,
      bg: "bg-signal/30",
      color: "text-signal-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <article
            key={c.id}
            className="group relative overflow-hidden rounded-2xl border border-border/80 bg-background/90 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span
                className={`grid size-9 place-items-center rounded-xl ${c.bg} ${c.color} transition-transform group-hover:scale-110`}
              >
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-4 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {typeof c.value === "number" ? c.value.toLocaleString("en-IN") : c.value}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="size-3" />
                {c.growth}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: AgentFull["status"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_COLORS[status]}`}
    >
      {status === "Active" ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {status}
    </span>
  );
}

// ─── Add / Edit Agent Form ────────────────────────────────────────────────────
interface AgentFormData {
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  joinDate: string;
  status: "Active" | "Inactive";
  tempPassword: string;
  specialization: "Health" | "Motor" | "Both";
  region: string;
  licenseNumber: string;
}

const emptyForm: AgentFormData = {
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  joinDate: new Date().toISOString().split("T")[0]!,
  status: "Active",
  tempPassword: "",
  specialization: "Both",
  region: "",
  licenseNumber: "",
};

function toFormData(agent: AgentFull): AgentFormData {
  return {
    name: agent.name,
    code: agent.code,
    email: agent.email,
    phone: agent.phone,
    address: agent.address,
    city: agent.city,
    state: agent.state,
    joinDate: agent.joinDate,
    status: agent.status,
    tempPassword: "",
    specialization: agent.specialization,
    region: agent.region,
    licenseNumber: agent.licenseNumber,
  };
}

interface AgentFormModalProps {
  mode: "add" | "edit";
  initial?: AgentFormData;
  onClose: () => void;
  onSubmit: (data: AgentFormData) => void;
}

function AgentFormModal({ mode, initial = emptyForm, onClose, onSubmit }: AgentFormModalProps) {
  const [form, setForm] = useState<AgentFormData>(initial);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof AgentFormData, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onSubmit(form);
    }, 600);
  };

  const isAdd = mode === "add";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">
            {isAdd ? "Onboard New Agent" : "Edit Agent Profile"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isAdd
              ? "Register a new certified insurance agent and generate portal credentials."
              : "Update the agent's contact and operational details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Row 1: Name + Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="af-name" className="text-xs font-bold uppercase tracking-wider">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="af-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ramesh Chandra"
                className="mt-1 h-10 rounded-xl"
                required
              />
            </div>
            <div>
              <Label htmlFor="af-code" className="text-xs font-bold uppercase tracking-wider">
                Agent ID / Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="af-code"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="e.g. AGT-11"
                className="mt-1 h-10 rounded-xl"
                disabled={!isAdd}
                required
              />
            </div>
          </div>

          {/* Row 2: Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="af-email" className="text-xs font-bold uppercase tracking-wider">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="af-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="agent@insurex.com"
                className="mt-1 h-10 rounded-xl"
                required
              />
            </div>
            <div>
              <Label htmlFor="af-phone" className="text-xs font-bold uppercase tracking-wider">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="af-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 h-10 rounded-xl"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="af-address" className="text-xs font-bold uppercase tracking-wider">
              Address
            </Label>
            <Input
              id="af-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Street address"
              className="mt-1 h-10 rounded-xl"
            />
          </div>

          {/* City + State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="af-city" className="text-xs font-bold uppercase tracking-wider">
                City
              </Label>
              <Input
                id="af-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="e.g. Mumbai"
                className="mt-1 h-10 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="af-state" className="text-xs font-bold uppercase tracking-wider">
                State
              </Label>
              <Input
                id="af-state"
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="e.g. Maharashtra"
                className="mt-1 h-10 rounded-xl"
              />
            </div>
          </div>

          {/* Specialization + Region */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="af-spec" className="text-xs font-bold uppercase tracking-wider">
                Specialization
              </Label>
              <select
                id="af-spec"
                value={form.specialization}
                onChange={(e) => set("specialization", e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="Health">Health Insurance</option>
                <option value="Motor">Motor Insurance</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <Label htmlFor="af-region" className="text-xs font-bold uppercase tracking-wider">
                Assigned Region
              </Label>
              <Input
                id="af-region"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                placeholder="e.g. Mumbai North"
                className="mt-1 h-10 rounded-xl"
              />
            </div>
          </div>

          {/* License + Join Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="af-license" className="text-xs font-bold uppercase tracking-wider">
                License Number
              </Label>
              <Input
                id="af-license"
                value={form.licenseNumber}
                onChange={(e) => set("licenseNumber", e.target.value)}
                placeholder="LIC-MH-2024-XXXX"
                className="mt-1 h-10 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="af-join" className="text-xs font-bold uppercase tracking-wider">
                Date of Joining
              </Label>
              <Input
                id="af-join"
                type="date"
                value={form.joinDate}
                onChange={(e) => set("joinDate", e.target.value)}
                className="mt-1 h-10 rounded-xl"
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="af-status" className="text-xs font-bold uppercase tracking-wider">
                Status
              </Label>
              <select
                id="af-status"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            {isAdd && (
              <div>
                <Label htmlFor="af-pass" className="text-xs font-bold uppercase tracking-wider">
                  Temporary Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="af-pass"
                  type="password"
                  value={form.tempPassword}
                  onChange={(e) => set("tempPassword", e.target.value)}
                  placeholder="Min 8 characters"
                  className="mt-1 h-10 rounded-xl"
                  required={isAdd}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl text-xs">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isAdd ? (
                "Create Agent"
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Agent Detail Drawer ──────────────────────────────────────────────────────
function AgentDetailDrawer({
  agent,
  onClose,
  onEdit,
}: {
  agent: AgentFull;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-background shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur-sm">
          <h2 className="font-display text-lg font-bold">Agent Profile</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="h-8 rounded-lg text-xs font-semibold"
            >
              <Edit2 className="size-3 mr-1" /> Edit
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {/* Profile Header */}
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface/50 p-4">
            <div className="relative">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 font-display text-xl font-bold text-primary ring-2 ring-primary/20">
                {agent.avatar}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-background ${agent.status === "Active" ? "bg-signal" : "bg-destructive"}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl font-extrabold text-foreground truncate">
                {agent.name}
              </h3>
              <p className="text-xs text-muted-foreground">{agent.code}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={agent.status} />
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${SPEC_COLORS[agent.specialization]}`}
                >
                  {agent.specialization === "Health" && <HeartPulse className="size-3 mr-1" />}
                  {agent.specialization === "Motor" && <Shield className="size-3 mr-1" />}
                  {agent.specialization}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="size-4 fill-amber-400" />
              <span className="font-bold text-sm">{agent.rating}</span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Contact Details
            </h4>
            {[
              { icon: Mail, label: "Email", value: agent.email },
              { icon: Phone, label: "Phone", value: agent.phone },
              {
                icon: MapPin,
                label: "Address",
                value: `${agent.address}, ${agent.city}, ${agent.state} — ${agent.pincode}`,
              },
              { icon: Shield, label: "License", value: agent.licenseNumber },
              { icon: MapPin, label: "Region", value: agent.region },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">{label}: </span>
                  <span className="font-semibold text-foreground">{value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Policies Sold", value: agent.policiesSold, color: "text-primary" },
              {
                label: "Premium Book",
                value: formatINR(agent.premiumGenerated),
                color: "text-primary",
                small: true,
              },
              { label: "Customers", value: agent.customers, color: "text-foreground" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-surface/50 p-3 text-center"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  {s.label}
                </span>
                <span
                  className={`font-display font-extrabold ${s.small ? "text-sm" : "text-xl"} ${s.color} block mt-1`}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          {/* Joined & specialization detail */}
          <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined:</span>
              <span className="font-bold text-foreground">
                {new Date(agent.joinDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Recent Policies */}
          {agent.recentPolicies && agent.recentPolicies.length > 0 && (
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Recent Policies
              </h4>
              <div className="space-y-2">
                {agent.recentPolicies.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-surface/40 p-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-foreground">{p.policyNumber}</span>
                      <p className="text-muted-foreground mt-0.5">
                        {p.customerName} · {p.policyName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground">{formatINR(p.premium)}</span>
                      <p
                        className={`text-[10px] mt-0.5 font-bold ${p.status === "Active" ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {p.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Feed */}
          {agent.activity && agent.activity.length > 0 && (
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Recent Activity
              </h4>
              <div className="space-y-2.5 border-l-2 border-border pl-4">
                {agent.activity.map((act) => (
                  <div key={act.id} className="text-xs relative">
                    <span className="absolute -left-[1.35rem] top-1 size-2 rounded-full bg-primary ring-2 ring-background" />
                    <span className="font-bold text-foreground">{act.action}</span>
                    <p className="text-muted-foreground mt-0.5">{act.detail}</p>
                    <span className="text-[10px] text-muted-foreground/70">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Agent Performance Charts ─────────────────────────────────────────────────
function AgentPerformanceCharts() {
  const [metric, setMetric] = useState<"policiesSold" | "premiumGenerated">("policiesSold");

  return (
    <section className="rounded-2xl border border-border/80 bg-background/90 p-5 shadow-xs backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4.5 text-primary" />
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
              Agent Performance Overview
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparative production and premium generation by certified field agent
          </p>
        </div>
        <div className="flex items-center rounded-xl border border-border bg-surface/60 p-1 w-fit">
          {[
            { id: "policiesSold", label: "Policies Sold" },
            { id: "premiumGenerated", label: "Premium" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMetric(tab.id as typeof metric)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                metric === tab.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={agentPoliciesChartData}
            margin={{ top: 5, right: 5, left: metric === "premiumGenerated" ? 30 : -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              opacity={0.08}
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              {...(metric === "premiumGenerated"
                ? { tickFormatter: (val: number) => `₹${(val / 100000).toFixed(1)}L` }
                : {})}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length && payload[0]) {
                  const item = payload[0].payload as (typeof agentPoliciesChartData)[0];
                  return (
                    <div className="rounded-xl border border-border bg-background p-3 shadow-lg text-xs">
                      <p className="font-bold text-foreground">{item.fullName}</p>
                      <p className="text-muted-foreground">{label}</p>
                      <div className="mt-1 font-semibold text-primary">
                        {metric === "policiesSold"
                          ? `${item.policiesSold} Policies`
                          : formatINR(item.premiumGenerated)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey={metric} fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function AdminAgentsPage() {
  const navigate = useNavigate();

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Agent state (starts from mock data, supports create/update/toggle in-memory)
  const [agents, setAgents] = useState<AgentFull[]>(agentsFullList);

  // Search + filter + sort state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("policiesSold");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Drawer / modal state
  const [viewAgent, setViewAgent] = useState<AgentFull | null>(null);
  const [editAgent, setEditAgent] = useState<AgentFull | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Computed agents list
  const filteredAgents = useMemo(() => {
    let list = [...agents];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.phone.includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "All") {
      list = list.filter((a) => a.status === statusFilter);
    }

    // Date joined filter (month-year match, e.g. "2024-01")
    if (dateFilter) {
      list = list.filter((a) => a.joinDate.startsWith(dateFilter));
    }

    // Sort
    list.sort((a, b) => {
      if (sortField === "joinDate") {
        const av = new Date(a.joinDate).getTime();
        const bv = new Date(b.joinDate).getTime();
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const av = a[sortField] as number;
      const bv = b[sortField] as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return list;
  }, [agents, search, statusFilter, dateFilter, sortField, sortDir]);

  // Live KPI based on current full list
  const liveKpi = {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === "Active").length,
    inactiveAgents: agents.filter((a) => a.status === "Inactive").length,
    totalPoliciesSold: agents.reduce((s, a) => s + a.policiesSold, 0),
    totalPremiumGenerated: agents.reduce((s, a) => s + a.premiumGenerated, 0),
    agentsGrowth: agentKpiData.agentsGrowth,
    activeGrowth: agentKpiData.activeGrowth,
    inactiveGrowth: agentKpiData.inactiveGrowth,
    soldGrowth: agentKpiData.soldGrowth,
  };

  // Sort toggle helper
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Agent CRUD handlers
  const handleAdd = (data: AgentFormData) => {
    const newAgent: AgentFull = {
      id: `agt-${Date.now()}`,
      name: data.name,
      code: data.code,
      avatar: data.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: "",
      policiesSold: 0,
      premiumGenerated: 0,
      customers: 0,
      status: data.status,
      joinDate: data.joinDate,
      rating: 4.0,
      specialization: data.specialization,
      region: data.region,
      licenseNumber: data.licenseNumber,
      activity: [
        {
          id: `act-${Date.now()}`,
          action: "Agent Onboarded",
          detail: `${data.name} registered on the InsureX Prime platform`,
          time: "Just now",
        },
      ],
    };
    setAgents((prev) => [newAgent, ...prev]);
    setAddOpen(false);
    toast.success(`Agent ${data.name} created successfully!`);
  };

  const handleEdit = (data: AgentFormData) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === editAgent?.id
          ? {
              ...a,
              name: data.name,
              email: data.email,
              phone: data.phone,
              address: data.address,
              city: data.city,
              state: data.state,
              status: data.status,
              specialization: data.specialization,
              region: data.region,
              licenseNumber: data.licenseNumber,
            }
          : a,
      ),
    );
    // Also update viewAgent if open
    if (viewAgent && viewAgent.id === editAgent?.id) {
      setViewAgent((prev) =>
        prev
          ? {
              ...prev,
              name: data.name,
              email: data.email,
              phone: data.phone,
              address: data.address,
              city: data.city,
              state: data.state,
              status: data.status,
              specialization: data.specialization,
              region: data.region,
              licenseNumber: data.licenseNumber,
            }
          : prev,
      );
    }
    setEditAgent(null);
    toast.success("Agent profile updated successfully!");
  };

  const handleToggleStatus = (agent: AgentFull) => {
    const newStatus = agent.status === "Active" ? "Inactive" : "Active";
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, status: newStatus } : a)));
    toast.success(
      `Agent ${agent.name} ${newStatus === "Active" ? "activated" : "deactivated"} successfully.`,
    );
  };

  const isFiltered = search || statusFilter !== "All" || dateFilter;

  return (
    <div className="min-h-screen bg-surface/30 text-foreground selection:bg-primary/20 selection:text-primary">
      <Toaster position="top-right" richColors />

      <AdminSidebar
        currentPath="/admin/agents"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenExport={() => setExportOpen(true)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <AdminHeader
          onToggleSidebar={() => setSidebarOpen(true)}
          onOpenExport={() => setExportOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* ── Page Header ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <UsersRound className="size-5 text-primary" />
                <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Agents
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Manage and monitor all InsureX certified insurance agents
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-44 rounded-xl bg-background pl-9 text-xs sm:w-56 focus-visible:ring-1 focus-visible:ring-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Export button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5 hidden sm:flex"
              >
                <Download className="size-3.5 text-primary" />
                Export
              </Button>

              {/* Add Agent */}
              <Button
                type="button"
                onClick={() => setAddOpen(true)}
                className="h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add Agent</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          {/* ── KPI Cards ────────────────────────────────────────────────── */}
          <AgentKpiCards stats={liveKpi} />

          {/* ── Filters & Sort Bar ───────────────────────────────────────── */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/80 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Filter className="size-3.5 text-primary" />
              <span>Filters</span>
              {isFiltered && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Active
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status filter */}
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-9 appearance-none rounded-xl border border-border bg-surface/50 px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="All">Status: All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {/* Date joined filter */}
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <input
                  type="month"
                  aria-label="Filter by join month"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-surface/50 pl-8 pr-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                />
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface/50 px-3 h-9 text-xs font-medium text-foreground">
                <ArrowUpDown className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Sort:</span>
                <select
                  aria-label="Sort by field"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="bg-transparent focus:outline-none cursor-pointer font-semibold text-foreground"
                >
                  <option value="policiesSold">Policies Sold</option>
                  <option value="premiumGenerated">Premium</option>
                  <option value="joinDate">Join Date</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="cursor-pointer text-primary hover:text-primary/80 font-bold"
                  aria-label="Toggle sort direction"
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
              </div>

              {/* Reset */}
              {isFiltered && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("All");
                    setDateFilter("");
                  }}
                  className="h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* ── Agent Table ──────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/80 bg-background/90 shadow-xs backdrop-blur-sm overflow-hidden">
            {/* Table header row */}
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Agents Directory
                </h2>
                <p className="text-xs text-muted-foreground">
                  {filteredAgents.length} of {agents.length} agents shown
                </p>
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-border/70 bg-surface/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pl-5 pr-4">Agent</th>
                    <th className="py-3 px-4">Agent ID</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Email</th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort("policiesSold")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        Policies Sold
                        <ArrowUpDown className="size-3 opacity-60" />
                        {sortField === "policiesSold" && (
                          <span className="text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </span>
                    </th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort("premiumGenerated")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Premium Generated
                        <ArrowUpDown className="size-3 opacity-60" />
                        {sortField === "premiumGenerated" && (
                          <span className="text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </span>
                    </th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th
                      className="py-3 px-4 text-center cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort("joinDate")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        Joined
                        <ArrowUpDown className="size-3 opacity-60" />
                        {sortField === "joinDate" && (
                          <span className="text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </span>
                    </th>
                    <th className="py-3 pr-5 pl-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/50">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-sm text-muted-foreground">
                        <UsersRound className="size-10 mx-auto opacity-20 mb-3" />
                        <p>No agents match your current filters.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("All");
                            setDateFilter("");
                          }}
                          className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent) => (
                      <tr key={agent.id} className="group hover:bg-muted/40 transition-colors">
                        {/* Agent Name + Avatar */}
                        <td className="py-3.5 pl-5 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <div className="grid size-9 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs ring-1 ring-primary/20">
                                {agent.avatar}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${
                                  agent.status === "Active" ? "bg-signal" : "bg-destructive"
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{agent.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {agent.city}, {agent.state}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Agent ID */}
                        <td className="py-3.5 px-4">
                          <span className="rounded-md bg-surface/80 border border-border/50 px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
                            {agent.code}
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                          {agent.phone}
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 max-w-[180px]">
                          <span className="truncate block text-muted-foreground">
                            {agent.email}
                          </span>
                        </td>

                        {/* Policies Sold */}
                        <td className="py-3.5 px-4 text-center font-display font-bold text-foreground">
                          {agent.policiesSold}
                        </td>

                        {/* Premium */}
                        <td className="py-3.5 px-4 text-right font-display font-extrabold text-foreground">
                          {formatINR(agent.premiumGenerated)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={agent.status} />
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-4 text-center text-muted-foreground whitespace-nowrap">
                          {new Date(agent.joinDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pr-5 pl-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View */}
                            <button
                              type="button"
                              onClick={() => setViewAgent(agent)}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 text-[11px] font-semibold text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer"
                              title="View agent details"
                            >
                              <Eye className="size-3" />
                              View
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => setEditAgent(agent)}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                              title="Edit agent"
                            >
                              <Edit2 className="size-3" />
                              Edit
                            </button>

                            {/* Activate / Deactivate */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(agent)}
                              className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors cursor-pointer ${
                                agent.status === "Active"
                                  ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white"
                                  : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white"
                              }`}
                              title={
                                agent.status === "Active" ? "Deactivate agent" : "Activate agent"
                              }
                            >
                              {agent.status === "Active" ? (
                                <>
                                  <ShieldOff className="size-3" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="size-3" />
                                  Activate
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Agent Performance Charts ─────────────────────────────────── */}
          <AgentPerformanceCharts />

          {/* Footer */}
          <footer className="border-t border-border/80 pt-6 pb-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 InsureX Prime • Field Agent Management Portal</p>
            <div className="flex items-center gap-3 text-[11px]">
              <span>License Verification: Active</span>
              <span>•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                ● All Agent Services Operational
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* ── Export Modal ─────────────────────────────────────────────────────── */}
      <AdminExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />

      {/* ── Add Agent Modal ──────────────────────────────────────────────────── */}
      {addOpen && (
        <AgentFormModal mode="add" onClose={() => setAddOpen(false)} onSubmit={handleAdd} />
      )}

      {/* ── Edit Agent Modal ─────────────────────────────────────────────────── */}
      {editAgent && (
        <AgentFormModal
          mode="edit"
          initial={toFormData(editAgent)}
          onClose={() => setEditAgent(null)}
          onSubmit={handleEdit}
        />
      )}

      {/* ── View Agent Drawer ────────────────────────────────────────────────── */}
      {viewAgent && (
        <AgentDetailDrawer
          agent={viewAgent}
          onClose={() => setViewAgent(null)}
          onEdit={() => {
            setEditAgent(viewAgent);
            setViewAgent(null);
          }}
        />
      )}
    </div>
  );
}
