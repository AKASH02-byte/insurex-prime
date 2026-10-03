import { Anchor, Heart, ShieldCheck, Truck, Umbrella } from "lucide-react";

const card =
  "login-float absolute rounded-2xl border border-white/80 bg-background/75 p-4 shadow-nav backdrop-blur-md";

/** Decorative product cards behind the sign-in card. Large screens only. */
export function LoginFloatingCards() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mx-auto hidden max-w-7xl select-none overflow-hidden lg:block"
    >
      <div className={`${card} left-4 top-12 w-72 xl:left-8`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="grid size-10 place-items-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
            <Heart className="size-5" />
          </span>
        </div>
        <h4 className="text-xs font-semibold text-foreground">Health &amp; Critical Care</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">Individual and family cover</p>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-1.5 w-4/5 rounded-full bg-rose-500" />
        </div>
      </div>

      <div className={`${card} bottom-16 left-6 w-72 [animation-delay:0.8s] xl:left-14`}>
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-primary">
            <Truck className="size-5" />
          </span>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Motor &amp; Fleet Guard</h4>
            <p className="text-[11px] text-muted-foreground">Two-wheeler, car and commercial</p>
          </div>
        </div>
      </div>

      <div className={`${card} right-4 top-16 w-72 [animation-delay:1.5s] xl:right-10`}>
        <div className="mb-2">
          <span className="grid size-9 place-items-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-600">
            <Anchor className="size-5" />
          </span>
        </div>
        <h4 className="text-xs font-semibold text-foreground">Marine Hull &amp; Multi-modal</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">Cargo and transit cover</p>
      </div>

      <div className={`${card} bottom-20 right-6 w-72 [animation-delay:2.2s] xl:right-12`}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-100 bg-amber-50 text-amber-600">
            <Umbrella className="size-5" />
          </span>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Life &amp; Endowment</h4>
            <p className="text-[11px] text-muted-foreground">Protection and savings plans</p>
          </div>
        </div>
      </div>

      <div className={`${card} -left-6 top-1/2 w-60 -translate-y-1/2 p-3 opacity-80 xl:left-2`}>
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
            <ShieldCheck className="size-4" />
          </span>
          <span className="text-xs font-semibold text-foreground">Cyber Insurance</span>
        </div>
      </div>
    </div>
  );
}
