import { useQuery } from "@tanstack/react-query";
import { authApi, isApiConfigured, retryUnlessClientError } from "@/lib/api";

export const currentUserKey = ["auth", "me"] as const;

/** The signed-in API user (role, tenant). Only runs in the browser. */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: authApi.me,
    enabled: isApiConfigured && typeof window !== "undefined",
    retry: retryUnlessClientError,
    staleTime: 5 * 60_000,
  });
}
