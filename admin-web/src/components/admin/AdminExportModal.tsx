import {
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Table,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface AdminExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminExportModal({ isOpen, onClose }: AdminExportModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Policies",
    "Sales Report",
  ]);
  const [format, setFormat] = useState<"CSV" | "Excel" | "PDF">("CSV");
  const [dateScope, setDateScope] = useState<"all" | "month" | "ytd">("month");
  const [isExporting, setIsExporting] = useState(false);

  const categories = [
    { id: "Policies", label: "Policies", desc: "All catalog & bound policy records" },
    { id: "Customers", label: "Customers", desc: "Policyholder contacts & KYC status" },
    { id: "Agents", label: "Agents", desc: "Field network, commissions & targets" },
    { id: "Sales Report", label: "Sales Report", desc: "Production & underwritten summaries" },
    { id: "Complete Report", label: "Complete Report", desc: "Unified enterprise data package" },
  ];

  const toggleCategory = (catId: string) => {
    if (catId === "Complete Report") {
      if (selectedCategories.includes("Complete Report")) {
        setSelectedCategories([]);
      } else {
        setSelectedCategories(categories.map((c) => c.id));
      }
      return;
    }

    if (selectedCategories.includes(catId)) {
      setSelectedCategories((prev) => prev.filter((id) => id !== catId));
    } else {
      setSelectedCategories((prev) => [...prev, catId]);
    }
  };

  const handleExport = () => {
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one dataset to export.");
      return;
    }

    setIsExporting(true);

    setTimeout(() => {
      setIsExporting(false);
      const catCount = selectedCategories.length;
      toast.success(
        `Generated ${format} export for ${catCount} dataset${catCount > 1 ? "s" : ""}!`,
        {
          description: `Scope: ${dateScope === "all" ? "All Records" : dateScope === "month" ? "Current Month" : "Year to Date"}. File download started.`,
        },
      );
      onClose();
    }, 1100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Download className="size-5" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-bold">Export Data</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Generate and download insurance business records in your desired format
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2 text-xs">
          {/* Categories Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Select Datasets
              </Label>
              <button
                type="button"
                onClick={() => setSelectedCategories(categories.map((c) => c.id))}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Select All
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {categories.map((cat) => {
                const isChecked = selectedCategories.includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition-all cursor-pointer select-none ${
                      isChecked
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleCategory(cat.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground text-xs leading-none">{cat.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{cat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-foreground block mb-2">
              Export Format
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "CSV", label: "CSV", icon: Table, desc: "Spreadsheet ready" },
                {
                  id: "Excel",
                  label: "Excel (.xlsx)",
                  icon: FileSpreadsheet,
                  desc: "Formatted workbook",
                },
                { id: "PDF", label: "PDF Document", icon: FileText, desc: "Formal report" },
              ].map((fmt) => {
                const isSelected = format === fmt.id;
                const Icon = fmt.icon;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id as typeof format)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                        : "border-border bg-surface/40 hover:bg-surface text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-5 mb-1 text-inherit" />
                    <span className="font-bold text-xs leading-tight">{fmt.label}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{fmt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-foreground block mb-2">
              Date Scope
            </Label>
            <div className="flex gap-2">
              {[
                { id: "month", label: "Current Month (Sep 2026)" },
                { id: "ytd", label: "Year to Date (2026)" },
                { id: "all", label: "All Historic Records" },
              ].map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => setDateScope(scope.id as typeof dateScope)}
                  className={`flex-1 rounded-xl border py-2 px-2 text-center text-xs font-semibold transition-colors cursor-pointer ${
                    dateScope === scope.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="rounded-xl text-xs">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/95 flex items-center gap-1.5"
          >
            {isExporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Preparing {format}...</span>
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                <span>Export {selectedCategories.length} Datasets</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
