import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { endAdminSession } from "@/lib/admin-auth";
import { agentAuthApi, isApiConfigured } from "@/lib/api";

/** Ends the Super Admin web session and the API session cookie, then returns to /login. */
export function useAdminSignOut() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await endAdminSession();
      if (isApiConfigured) await agentAuthApi.logout().catch(() => undefined);
      await navigate({ to: "/login" });
    } catch {
      toast.error("Unable to end your session. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return { signOut, isSigningOut };
}
