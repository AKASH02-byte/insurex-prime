import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function SettingsSection({
  id,
  title,
  description,
  children,
  footer,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-border/80 bg-background/90 shadow-xs overflow-hidden"
    >
      <header className="border-b border-border/70 px-5 py-4 sm:px-6">
        <h2 className="font-display text-base font-bold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="divide-y divide-border/60">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
          {footer}
        </footer>
      )}
    </section>
  );
}

/** Label + description on the left, control on the right (stacked on mobile). */
export function SettingsRow({
  label,
  description,
  htmlFor,
  children,
  badge,
}: {
  label: string;
  description?: string | undefined;
  htmlFor?: string | undefined;
  children?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={htmlFor} className="text-sm font-semibold">
            {label}
          </Label>
          {badge}
        </div>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children !== undefined && <div className="shrink-0 sm:w-72 sm:max-w-[50%]">{children}</div>}
    </div>
  );
}

export function SettingsToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  saving,
  disabled,
  badge,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  saving?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
}) {
  return (
    <SettingsRow label={label} description={description} htmlFor={id} badge={badge}>
      <div className="flex items-center gap-2 sm:justify-end">
        {saving && (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Saving" />
        )}
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled || saving}
        />
      </div>
    </SettingsRow>
  );
}

export function SettingsInput({
  id,
  label,
  description,
  error,
  ...props
}: {
  id: string;
  label: string;
  description?: string;
  error?: string | undefined;
} & Omit<React.ComponentProps<typeof Input>, "id">) {
  return (
    <SettingsRow label={label} description={description} htmlFor={id}>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn("h-10 text-sm", error && "border-destructive")}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </SettingsRow>
  );
}

export function SettingsSelect({
  id,
  label,
  description,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <SettingsRow label={label} description={description} htmlFor={id}>
      <Select value={value} onValueChange={onChange} {...(disabled ? { disabled } : {})}>
        <SelectTrigger id={id} className="h-10 w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsRow>
  );
}

export type StatusTone = "ok" | "warn" | "bad" | "neutral";

const toneClass: Record<StatusTone, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25",
  warn: "bg-amber-500/10 text-amber-700 ring-amber-500/25",
  bad: "bg-destructive/10 text-destructive ring-destructive/20",
  neutral: "bg-muted text-muted-foreground ring-border",
};

export function ConfigStatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        toneClass[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

export function SystemStatusCard({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone: StatusTone;
  detail?: string | undefined;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <ConfigStatusBadge tone={tone}>{value}</ConfigStatusBadge>
      </div>
      {detail && <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export const DEPLOYMENT_MANAGED = "Managed by deployment configuration";
