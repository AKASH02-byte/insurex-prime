import { ShieldCheck } from "lucide-react";

/** The agency's logo, or the default InsuroX mark when none has been uploaded. */
export function TenantLogo({
  logoUrl,
  name,
  size = "md",
}: {
  logoUrl?: string | null | undefined;
  name?: string | undefined;
  /** "lg" is the sidebar header size; "md" suits table rows. */
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "size-12" : "size-9";
  const icon = size === "lg" ? "size-6" : "size-5";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ? `${name} logo` : "Agency logo"}
        className={`${box} shrink-0 rounded-xl bg-background object-contain ring-1 ring-black/10 dark:ring-white/10`}
      />
    );
  }
  return (
    <span
      className={`grid ${box} shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm`}
    >
      <ShieldCheck className={icon} />
    </span>
  );
}
