import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AgentCredentials {
  name: string;
  agentCode: string;
  phone: string;
  password: string;
}

function Row({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); the value is selectable anyway.
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface/50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate font-mono text-sm font-bold text-foreground select-all">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="size-8 shrink-0 cursor-pointer"
      >
        {copied ? <Check className="size-4 text-signal" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

/** Shown once after an agent is created, so the Super Admin can hand over the login. */
export function AgentCredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: AgentCredentials | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(credentials)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Agent created</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {credentials?.name} can sign in with either ID below. They must set their own password
            at first sign-in.
          </DialogDescription>
        </DialogHeader>
        {credentials && (
          <div className="space-y-2 py-1">
            <Row label="Agent ID" value={credentials.agentCode} />
            <Row label="Or phone number" value={credentials.phone} />
            <Row label="Default password" value={credentials.password} />
          </div>
        )}
        <DialogFooter>
          <Button type="button" onClick={onClose} className="rounded-xl text-xs font-semibold">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
