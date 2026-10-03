import { ShieldCheck } from "lucide-react";

/** The agency's logo, or the default InsuroX mark when none has been uploaded. */
export function TenantLogo({
  logoUrl,
  name,
}: {
  logoUrl?: string | null | undefined;
  name?: string | undefined;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ? `${name} logo` : "Agency logo"}
        className="size-9 rounded-xl border border-border/70 bg-background object-contain"
      />
    );
  }
  return (
    <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
      <ShieldCheck className="size-5" />
    </span>
  );
}
