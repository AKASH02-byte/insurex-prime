import type { QueryClient } from "@tanstack/react-query";
import { isRedirect, redirect } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin-auth";
import { currentUserKey } from "@/hooks/use-current-user";
import { authApi, isApiConfigured, type CurrentUser } from "@/lib/api";

type GuardArgs = { context: { queryClient: QueryClient } };

// A page change reuses the user fetched a moment ago instead of waiting on another /auth/me.
// Short on purpose: the API still checks every request, this only skips repeat round trips.
const GUARD_STALE_MS = 30_000;

/**
 * The signed-in API user, or null when there is no (valid) session. Browser only.
 * Shares the cache key with useCurrentUser, so the page's own request is a cache hit.
 */
async function currentUser(queryClient: QueryClient): Promise<CurrentUser | null> {
  if (!isApiConfigured || typeof window === "undefined") return null;
  try {
    return await queryClient.ensureQueryData({
      queryKey: currentUserKey,
      queryFn: authApi.me,
      staleTime: GUARD_STALE_MS,
    });
  } catch {
    return null;
  }
}

/**
 * Guards the tenant admin pages. The session is the API's HttpOnly cookie, so this runs
 * in the browser only (these routes are `ssr: false`).
 *  - TENANT_ADMIN: allowed, after replacing a temporary password.
 *  - SUPER_ADMIN (platform): belongs on the tenants page.
 *  - Without an API (demo mode) the old web session still opens the demo pages.
 */
export async function requireAdminSession({ context }: GuardArgs) {
  if (!isApiConfigured) {
    if (await getAdminSession()) return;
    throw redirect({ to: "/login" });
  }
  const user = await currentUser(context.queryClient);
  if (user?.role === "TENANT_ADMIN") {
    if (user.mustChangePassword) throw redirect({ to: "/admin/change-password" });
    return;
  }
  if (user?.role === "SUPER_ADMIN") throw redirect({ to: "/admin/tenants" });
  throw redirect({ to: "/login" });
}

/** Guards the platform pages (tenants, insurers): the platform Super Admin only. */
export async function requirePlatformSession({ context }: GuardArgs) {
  const user = await currentUser(context.queryClient);
  if (user?.role === "SUPER_ADMIN") return;
  if (user?.role === "TENANT_ADMIN") throw redirect({ to: "/admin/dashboard" });
  throw redirect({ to: "/login" });
}

/** Guards the forced password change page: any signed-in tenant admin. */
export async function requireTenantAdminAnyState({ context }: GuardArgs) {
  const user = await currentUser(context.queryClient);
  if (user?.role !== "TENANT_ADMIN") throw redirect({ to: "/login" });
  if (!user.mustChangePassword) throw redirect({ to: "/admin/dashboard" });
}

export { isRedirect };
