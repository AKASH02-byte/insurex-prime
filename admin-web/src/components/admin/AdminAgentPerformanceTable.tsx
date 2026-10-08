import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ExternalLink,
  Eye,
  Mail,
  ShieldCheck,
  Star,
  User,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR, type AgentPerformanceRecord } from "./admin-mock-data";

export interface AdminAgentPerformanceTableProps {
  agents: AgentPerformanceRecord[];
}

export function AdminAgentPerformanceTable({ agents }: AdminAgentPerformanceTableProps) {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformanceRecord | null>(null);

  return (
    <section aria-label="Agent Performance" className="w-full">
      <div className="rounded-xl border border-border/80 bg-background/90 p-3.5 shadow-xs sm:rounded-2xl sm:p-5 backdrop-blur-sm">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="size-4.5 text-primary" />
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                Agent Performance
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Production metrics, policies bound, and gross premium by certified field agents
            </p>
          </div>

          <Link
            to="/admin/agents"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <span>View All Agents</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Table Container with Horizontal Scroll for Mobile */}
        <div className="mt-4 overflow-x-auto">
          <table data-cards className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/70 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pr-4 pl-1">Agent</th>
                <th className="py-3 px-4 text-center">Policies Sold</th>
                <th className="py-3 px-4 text-right">Premium Generated</th>
                <th className="py-3 px-4 text-center">Customers</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 pl-4 pr-1 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-medium">
              {agents.map((agent) => (
                <tr key={agent.id} className="transition-colors hover:bg-muted/40 group">
                  {/* Agent Info */}
                  <td className="py-3.5 pr-4 pl-1">
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs ring-1 ring-primary/20 shrink-0">
                        {agent.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{agent.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{agent.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Policies Sold */}
                  <td className="py-3.5 px-4 text-center font-display font-bold text-foreground">
                    {agent.policiesSold}
                  </td>

                  {/* Premium Generated */}
                  <td className="py-3.5 px-4 text-right font-display font-extrabold text-foreground">
                    {formatINR(agent.premiumGenerated)}
                  </td>

                  {/* Customers */}
                  <td className="py-3.5 px-4 text-center text-muted-foreground">
                    {agent.customers}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      {agent.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 pl-4 pr-1 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAgent(agent)}
                      className="h-8 rounded-lg px-2.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer"
                    >
                      <Eye className="size-3.5 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Summary / Quick Link */}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>Showing top {agents.length} active agents</span>
          <Link
            to="/admin/agents"
            className="font-medium text-primary hover:underline flex items-center gap-1"
          >
            Manage Commission & Field Teams <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* Agent Detail Modal */}
      <Dialog
        open={Boolean(selectedAgent)}
        onOpenChange={(open) => !open && setSelectedAgent(null)}
      >
        {selectedAgent && (
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-base">
                  {selectedAgent.avatar}
                </div>
                <div>
                  <DialogTitle className="font-display text-xl font-bold">
                    {selectedAgent.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Agent ID: {selectedAgent.code} • Joined {selectedAgent.joinDate}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface/50 p-3">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Policies Bound
                  </span>
                  <p className="font-display text-xl font-bold text-foreground mt-1">
                    {selectedAgent.policiesSold}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface/50 p-3">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Premium Book
                  </span>
                  <p className="font-display text-xl font-bold text-primary mt-1">
                    {formatINR(selectedAgent.premiumGenerated)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface/50 p-3">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Active Customers
                  </span>
                  <p className="font-display text-xl font-bold text-foreground mt-1">
                    {selectedAgent.customers}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface/50 p-3">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Customer Satisfaction
                  </span>
                  <p className="font-display text-xl font-bold text-amber-600 flex items-center gap-1 mt-1">
                    <Star className="size-4 fill-amber-500 text-amber-500" />
                    {selectedAgent.rating} / 5.0
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-3 text-muted-foreground flex items-center justify-between">
                <span>Email Address</span>
                <span className="font-semibold text-foreground">{selectedAgent.email}</span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-xl text-xs">
                  Close
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={() => {
                  setSelectedAgent(null);
                  navigate({ to: "/admin/agents" });
                }}
                className="rounded-xl bg-primary text-primary-foreground text-xs"
              >
                Go to Agents Directory
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
