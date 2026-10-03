import type { ReactNode } from "react";

/** Phone-only sticky header: tenant name over the page title, with action buttons on the right. */
export function MobileTopBar({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mobile-chrome sticky top-0 z-30 border-b border-border/50 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-between gap-2 px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
          <p className="truncate text-[17px] font-semibold leading-snug tracking-tight">{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">{children}</div>
      </div>
    </div>
  );
}

/** 44px tap target icon button used in the mobile top bar. */
export const mobileIconButton =
  "relative grid size-11 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground active:bg-muted";
