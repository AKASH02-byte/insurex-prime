import { Link } from "@tanstack/react-router";
import { CheckCircle2, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiPolicy } from "@/lib/api/types";
import { formatDuration, formatINR, premiumFrequencyLabel } from "@/lib/format";
import { CodeChip, DetailRow, InsuranceTypeBadge } from "./agent-ui";

const label = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");

/** Health- or motor-specific details from the catalog. */
export function categoryDetailRows(policy: ApiPolicy): [string, string][] {
  const details = policy.categoryDetails;
  if (!details) return [];
  if (details.kind === "HEALTH") {
    return [
      ["Plan type", label(details.planType)],
      ["Sum insured", formatINR(details.sumInsured)],
      ["Hospitalization", details.hospitalizationCoverage],
      ["Waiting period", details.waitingPeriod],
      ["Age eligibility", details.ageEligibility],
    ];
  }
  return [
    ["Vehicle type", label(details.vehicleType)],
    ["Coverage type", label(details.coverageType)],
    ["Own damage", details.ownDamage],
    ["Third-party cover", details.thirdPartyCoverage],
    ["Vehicle eligibility", details.vehicleEligibility],
  ];
}

export function PolicyBenefits({ benefits }: { benefits: string[] }) {
  if (benefits.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {benefits.map((benefit) => (
        <li key={benefit} className="flex items-start gap-2 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>{benefit}</span>
        </li>
      ))}
    </ul>
  );
}

export function PolicyDetailDialog({
  policy,
  onClose,
}: {
  policy: ApiPolicy | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(policy)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        {policy && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{policy.policyName}</DialogTitle>
              <DialogDescription>{policy.description || "Catalog policy"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <CodeChip>{policy.policyCode}</CodeChip>
                <InsuranceTypeBadge type={policy.insuranceType} />
              </div>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <DetailRow label="Premium" value={formatINR(policy.premium)} />
                <DetailRow
                  label="Premium frequency"
                  value={premiumFrequencyLabel[policy.premiumFrequency]}
                />
                <DetailRow label="Duration" value={formatDuration(policy.durationMonths)} />
                <DetailRow label="Coverage" value={formatINR(policy.coverageAmount)} />
                {categoryDetailRows(policy).map(([key, value]) => (
                  <DetailRow key={key} label={key} value={value} />
                ))}
              </dl>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Benefits
                </h3>
                <PolicyBenefits benefits={policy.benefits} />
              </div>
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Eligibility
                </h3>
                <p className="text-sm text-foreground">{policy.eligibility || "—"}</p>
              </div>
              {policy.terms && (
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Terms
                  </h3>
                  <p className="text-sm text-muted-foreground">{policy.terms}</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                Close
              </Button>
              <Button asChild className="rounded-xl">
                <Link to="/agent/sell-policy" search={{ policyId: policy.id }}>
                  <FilePlus2 /> Record sold policy
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
