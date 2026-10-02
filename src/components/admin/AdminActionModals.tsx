import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AgentCredentialsDialog,
  type AgentCredentials,
} from "@/components/admin/AgentCredentialsDialog";
import { adminKeys } from "@/lib/admin-queries";
import { agentsApi, isApiConfigured } from "@/lib/api";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ModalType = "add_agent" | "add_customer" | "add_policy" | "generate_report" | null;

export interface AdminActionModalsProps {
  modalType: ModalType;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminActionModals({ modalType, onClose, onSuccess }: AdminActionModalsProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<AgentCredentials | null>(null);
  const queryClient = useQueryClient();

  // Stays mounted after the form closes so the one-time credentials remain visible.
  if (!modalType) {
    return (
      <AgentCredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    );
  }

  const createAgent = async () => {
    const created = await agentsApi.create({
      fullName: (formData["agentName"] ?? "").trim(),
      email: (formData["agentEmail"] ?? "").trim(),
      phone: (formData["agentPhone"] ?? "").trim(),
      ...(formData["agentCode"]?.trim() ? { agentCode: formData["agentCode"].trim() } : {}),
    });
    void queryClient.invalidateQueries({ queryKey: adminKeys.agents });
    setCredentials({
      name: created.fullName,
      agentCode: created.agentCode,
      phone: created.phone,
      password: created.temporaryPassword,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Live mode: Add Agent hits the API, which generates the default login credentials.
    if (modalType === "add_agent" && isApiConfigured) {
      try {
        await createAgent();
        setFormData({});
        onSuccess?.();
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the agent.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setTimeout(() => {
      setIsSubmitting(false);
      switch (modalType) {
        case "add_agent":
          toast.success("New certified agent registered successfully!");
          break;
        case "add_customer":
          toast.success("Customer profile created and linked to portal!");
          break;
        case "add_policy":
          toast.success("New insurance policy product defined in catalog!");
          break;
        case "generate_report":
          toast.success("Executive Operations Report compiled & ready!");
          break;
      }
      setFormData({});
      onSuccess?.();
      onClose();
    }, 600);
  };

  const getModalConfig = () => {
    switch (modalType) {
      case "add_agent":
        return {
          title: "Onboard New Agent",
          description:
            "Login ID is the Agent ID or phone; the default password is generated automatically (first 5 letters of the first name @ phone)",
          fields: [
            {
              id: "agentName",
              label: "Full Name",
              placeholder: "e.g. Ramesh Chandra",
              required: true,
            },
            {
              id: "agentEmail",
              label: "Email Address",
              placeholder: "ramesh.c@insurex.com",
              type: "email",
              required: true,
            },
            {
              id: "agentPhone",
              label: "Phone Number",
              placeholder: "e.g. 9876543210",
              type: "tel",
              required: true,
            },
            {
              id: "agentCode",
              label: "Agent ID (optional)",
              placeholder: "Auto-generated if left empty",
              required: false,
            },
            {
              id: "region",
              label: "Assigned Region / Territory",
              placeholder: "e.g. Mumbai North",
              required: false,
            },
          ],
          actionLabel: "Save & Onboard Agent",
        };
      case "add_customer":
        return {
          title: "Register New Customer",
          description: "Create customer profile for health or motor policy binding",
          fields: [
            {
              id: "customerName",
              label: "Customer Full Name",
              placeholder: "e.g. Deepika Rao",
              required: true,
            },
            {
              id: "customerEmail",
              label: "Customer Email",
              placeholder: "deepika.rao@example.com",
              type: "email",
              required: true,
            },
            {
              id: "customerPhone",
              label: "Mobile Number",
              placeholder: "+91 98765 43210",
              required: true,
            },
            {
              id: "assignedAgent",
              label: "Assigned Agent (Optional)",
              placeholder: "e.g. Agent 01 (Rajesh V.)",
              required: false,
            },
          ],
          actionLabel: "Register Customer",
        };
      case "add_policy":
        return {
          title: "Add New Policy Product",
          description: "Add a health or motor insurance plan to the active InsureX catalog",
          fields: [
            {
              id: "policyName",
              label: "Policy Title",
              placeholder: "e.g. Health Platinum Shield",
              required: true,
            },
            {
              id: "category",
              label: "Category",
              placeholder: "Health Insurance or Motor Insurance",
              required: true,
            },
            {
              id: "basePremium",
              label: "Base Annual Premium (INR)",
              placeholder: "e.g. 18500",
              required: true,
            },
            {
              id: "coverageDetails",
              label: "Coverage Sum Insured",
              placeholder: "e.g. ₹10,00,000",
              required: true,
            },
          ],
          actionLabel: "Publish Policy to Catalog",
        };
      case "generate_report":
        return {
          title: "Generate Operations Report",
          description: "Synthesize business performance, agent commissions, and policy statistics",
          fields: [
            {
              id: "reportTitle",
              label: "Report Heading",
              placeholder: "Q3 2026 Executive Insurance Summary",
              required: true,
            },
            {
              id: "recipients",
              label: "Deliver To Email",
              placeholder: "board@insurex.com",
              type: "email",
              required: true,
            },
          ],
          actionLabel: "Generate & Send Report",
        };
      default:
        return null;
    }
  };

  const config = getModalConfig();
  if (!config) return null;

  return (
    <Dialog open={Boolean(modalType)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">{config.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {config.fields.map((field) => (
            <div key={field.id}>
              <Label htmlFor={field.id} className="text-xs font-bold uppercase tracking-wider">
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id={field.id}
                type={field.type || "text"}
                placeholder={field.placeholder}
                required={field.required}
                value={formData[field.id] || ""}
                onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                className="mt-1 h-10 rounded-xl"
              />
            </div>
          ))}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl text-xs">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
            >
              {isSubmitting ? "Processing..." : config.actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
