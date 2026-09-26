import { redirect } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin-auth";

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) throw redirect({ to: "/login" });
}
