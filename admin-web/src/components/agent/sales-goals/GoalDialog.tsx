import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  cadenceLabel,
  salesGoalsStore,
  type GoalCadence,
  type SalesGoal,
} from "../sales-goals-data";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Record<GoalCadence, SalesGoal>;
  cadence: GoalCadence;
  onSaved?: (cadence: GoalCadence) => void;
}

const fieldClass =
  "h-12 rounded-md border-fo-outline bg-fo-lowest text-sm focus-visible:border-fo-primary focus-visible:ring-1 focus-visible:ring-fo-primary sm:h-10";

export function GoalDialog({ open, onOpenChange, goals, cadence, onSaved }: GoalDialogProps) {
  const [selected, setSelected] = useState<GoalCadence>(cadence);
  const [title, setTitle] = useState("");
  const [targetPolicies, setTargetPolicies] = useState("");
  const [targetPremium, setTargetPremium] = useState("");

  const load = (value: GoalCadence) => {
    const goal = goals[value];
    setSelected(value);
    setTitle(goal.title);
    setTargetPolicies(String(goal.targetPolicies));
    setTargetPremium(String(goal.targetPremium));
  };

  useEffect(() => {
    if (open) load(cadence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cadence]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const policies = Number(targetPolicies);
    const premium = Number(targetPremium);
    if (!title.trim() || !Number.isFinite(policies) || policies < 1) {
      toast.error("Add a goal name and at least 1 policy.");
      return;
    }
    if (!Number.isFinite(premium) || premium < 0) {
      toast.error("Premium target must be a positive amount.");
      return;
    }
    salesGoalsStore.update(selected, {
      title: title.trim(),
      targetPolicies: Math.round(policies),
      targetPremium: Math.round(premium),
    });
    toast.success(`${cadenceLabel[selected]} goal updated`);
    onSaved?.(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 top-auto max-h-[92dvh] max-w-none translate-y-0 gap-0 overflow-y-auto rounded-t-2xl border-fo-outline/60 bg-fo-surface p-0 font-fo-body text-fo-ink data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:top-[50%] sm:max-w-md sm:translate-y-[-50%] sm:rounded-xl">
        <form onSubmit={submit}>
          <DialogHeader className="border-b border-fo-outline/50 px-5 pb-4 pt-5 text-left">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-fo-outline sm:hidden" />
            <DialogTitle className="font-fo-display text-lg font-bold">
              Add goal / adjust target
            </DialogTitle>
            <DialogDescription className="text-xs text-fo-muted">
              Set the commitment you want to track for each cadence.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-5 py-4">
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-fo-container p-1">
              {(Object.keys(cadenceLabel) as GoalCadence[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => load(value)}
                  aria-pressed={selected === value}
                  className={cn(
                    "h-9 cursor-pointer rounded-lg text-xs font-semibold transition-all",
                    selected === value
                      ? "bg-fo-lowest text-fo-primary shadow-sm"
                      : "text-fo-muted hover:text-fo-ink",
                  )}
                >
                  {cadenceLabel[value]}
                </button>
              ))}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-title" className="text-xs font-semibold">
                Commitment
              </Label>
              <Input
                id="goal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "Sell 2 policies this week"'
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="goal-policies" className="text-xs font-semibold">
                  Policies target
                </Label>
                <Input
                  id="goal-policies"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={targetPolicies}
                  onChange={(e) => setTargetPolicies(e.target.value)}
                  className={cn(fieldClass, "tabular-nums")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="goal-premium" className="text-xs font-semibold">
                  Premium target (₹)
                </Label>
                <Input
                  id="goal-premium"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={targetPremium}
                  onChange={(e) => setTargetPremium(e.target.value)}
                  className={cn(fieldClass, "tabular-nums")}
                />
              </div>
            </div>
            <p className="rounded-lg bg-fo-secondary-container/50 px-3 py-2 text-xs text-fo-on-secondary-container">
              Sold policies and closed premium are credited automatically from your recorded sales.
            </p>
          </div>

          <DialogFooter className="gap-2 border-t border-fo-outline/50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 rounded-md border-fo-outline sm:h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-12 rounded-md bg-fo-primary text-white hover:bg-[#004b73] sm:h-10"
            >
              Save goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
