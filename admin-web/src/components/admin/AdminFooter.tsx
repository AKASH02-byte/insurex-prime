import { AppFooter } from "@/components/AppFooter";
import { useCurrentUser } from "@/hooks/use-current-user";

/** Footer shared by every admin page, same as the agent portal's. */
export function AdminFooter() {
  const { data: me } = useCurrentUser();
  return <AppFooter tenantName={me?.tenant?.name} className="mx-auto w-full max-w-7xl" />;
}
