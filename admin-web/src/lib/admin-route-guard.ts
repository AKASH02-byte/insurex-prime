import { isRedirect, redirect } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin-auth";
import { authApi, isApiConfigured, type CurrentUser } from "@/lib/api";

/** The signed-in API user, or null when there is no (valid) session. Browser only. */
async function currentUser(): Promise<CurrentUser | null> {
  if (!isApiConfigured || typeof window === "undefined") return null;
  try {
    return await authApi.me();
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
export async function requireAdminSession() {
  if (!isApiConfigured) {
    if (await getAdminSession()) return;
    throw redirect({ to: "/login" });
  }
  const user = await currentUser();
  if (user?.role === "TENANT_ADMIN") {
    if (user.mustChangePassword) throw redirect({ to: "/admin/change-password" });
    return;
  }
  if (user?.role === "SUPER_ADMIN") throw redirect({ to: "/admin/tenants" });
  throw redirect({ to: "/login" });
}

/** Guards the platform pages (tenants, insurers): the platform Super Admin only. */
export async function requirePlatformSession() {
  const user = await currentUser();
  if (user?.role === "SUPER_ADMIN") return;
  if (user?.role === "TENANT_ADMIN") throw redirect({ to: "/admin/dashboard" });
  throw redirect({ to: "/login" });
}

/** Guards the forced password change page: any signed-in tenant admin. */
export async function requireTenantAdminAnyState() {
  const user = await currentUser();
  if (user?.role !== "TENANT_ADMIN") throw redirect({ to: "/login" });
  if (!user.mustChangePassword) throw redirect({ to: "/admin/dashboard" });
}

export { isRedirect };
