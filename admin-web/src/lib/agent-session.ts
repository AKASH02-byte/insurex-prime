/**
 * Remembers in this browser that an agent signed in, so /login can send them straight
 * back to the workspace. It is only a hint: the session itself is an HttpOnly cookie
 * the API verifies on every request, and nothing sensitive is stored here.
 */
const STORAGE_KEY = "insurex_agent_signed_in";

export function hasAgentSignInHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberAgentSignIn() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
    // Sessions from the previous sign-in flow kept a bearer token here; drop it.
    window.localStorage.removeItem("insurex_agent_session");
  } catch {
    // Storage blocked (private mode): /login just won't auto-redirect.
  }
}

export function forgetAgentSignIn() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("insurex_agent_session");
  } catch {
    // Nothing stored.
  }
}
