import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Admin / Agent Login — InsureX" },
      { name: "description", content: "InsureX secure portal access for administrators and agents." },
      { property: "og:title", content: "Admin / Agent Login — InsureX" },
      { property: "og:description", content: "InsureX secure portal access for administrators and agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPlaceholder,
});

function LoginPlaceholder() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <section className="w-full max-w-lg rounded-[2rem] border border-border bg-background p-8 text-center shadow-nav sm:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground"><ShieldCheck className="size-7" /></span>
        <h1 className="mt-7 font-display text-3xl font-extrabold">Secure portal coming next.</h1>
        <p className="mt-4 leading-7 text-muted-foreground">Admin and agent authentication is not enabled yet. The public InsureX experience is ready to explore.</p>
        <Button asChild className="mt-8 h-12 rounded-full px-6"><Link to="/"><ArrowLeft /> Back to InsureX</Link></Button>
      </section>
    </main>
  );
}