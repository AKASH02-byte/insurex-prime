import { createFileRoute, redirect } from "@tanstack/react-router";

// The public landing page lives in public-web; this app starts at the sign-in page.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
});
