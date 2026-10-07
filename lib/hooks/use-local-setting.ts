"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A string setting kept in localStorage that every component (and every tab) sees change live.
 * Server render and first paint use `fallback`, so there is never a hydration mismatch.
 */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useLocalSetting<T extends string>(key: string, fallback: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return (localStorage.getItem(key) as T | null) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {}
      notify();
    },
    [key],
  );
  return [value, set];
}

export function useLocalFlag(key: string, fallback = false): [boolean, (value: boolean) => void] {
  const [raw, setRaw] = useLocalSetting<"1" | "0">(key, fallback ? "1" : "0");
  const set = useCallback((v: boolean) => setRaw(v ? "1" : "0"), [setRaw]);
  return [raw === "1", set];
}
