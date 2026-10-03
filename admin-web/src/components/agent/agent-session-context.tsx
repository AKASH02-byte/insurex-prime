import { createContext, useContext } from "react";
import type { ApiAgent, CurrentUser } from "@/lib/api/types";

export interface AgentSessionValue {
  user: CurrentUser;
  agent: ApiAgent;
  /** Revokes the server session, clears cached agent data and returns to /login. */
  signOut: () => Promise<void>;
}

export const AgentSessionContext = createContext<AgentSessionValue | null>(null);

/** The signed-in agent. Only available inside the /agent layout. */
export function useAgentSession(): AgentSessionValue {
  const value = useContext(AgentSessionContext);
  if (!value) throw new Error("useAgentSession must be used inside the agent layout.");
  return value;
}
