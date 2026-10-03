import { useSyncExternalStore } from "react";

const STORAGE_KEY = "insurex.sidebar.collapsed";
const listeners = new Set<() => void>();

function read() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let collapsed = typeof window !== "undefined" && read();

// The page padding in styles.css follows this attribute, so every layout stays in step.
function apply() {
  if (typeof document !== "undefined") {
    document.documentElement.dataset["sidebar"] = collapsed ? "collapsed" : "expanded";
  }
}
apply();

function set(next: boolean) {
  collapsed = next;
  apply();
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Storage can be blocked; the toggle still works for this visit.
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Desktop sidebar state, remembered across visits and shared by the admin and agent layouts. */
export function useSidebarCollapsed() {
  const value = useSyncExternalStore(
    subscribe,
    () => collapsed,
    () => false,
  );
  return [value, () => set(!collapsed)] as const;
}
