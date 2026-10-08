import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "insurex.theme";
const listeners = new Set<() => void>();

function read(): ThemeMode {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

const prefersDark = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

let mode: ThemeMode = typeof window !== "undefined" ? read() : "system";

function apply() {
  if (typeof document === "undefined") return;
  const dark = mode === "dark" || (mode === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
apply();

if (typeof window !== "undefined") {
  // Follow the OS while the user has not picked a theme.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (mode === "system") {
      apply();
      listeners.forEach((listener) => listener());
    }
  });
}

export function setThemeMode(next: ThemeMode) {
  mode = next;
  try {
    if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
  apply();
  listeners.forEach((listener) => listener());
}

/** Runs before first paint (inlined in <head>) so a dark page never flashes light. */
export const THEME_INIT_SCRIPT = `try{var m=localStorage.getItem("${STORAGE_KEY}");if(m==="dark"||(m!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}}catch(e){}`;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const readDark = () => document.documentElement.classList.contains("dark");

export function useTheme() {
  const current = useSyncExternalStore(
    subscribe,
    () => mode,
    () => "system" as ThemeMode,
  );
  // Server render is always "light"; the client corrects it right after hydration.
  const isDark = useSyncExternalStore(subscribe, readDark, () => false);
  return {
    mode: current,
    isDark,
    toggle: () => setThemeMode(isDark ? "light" : "dark"),
  };
}
