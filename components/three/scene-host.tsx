"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocalFlag } from "@/lib/hooks/use-local-setting";
import type { AuroraController, SceneMode } from "./aurora-scene";

/**
 * Mounts the Aurora background once for the whole app and decides how hard it works per route:
 *   landing, sign in, sign up, invite links  → full motion
 *   /rooms (the dashboard)                   → calm, 30 fps, dimmed
 *   inside a room                            → one still frame, because live editing and sync are already busy
 * People can turn the background off (`tuon-bg-paused`) or keep it moving inside rooms (`tuon-bg-in-rooms`).
 * three.js is imported on demand, so it never lands in the first-load bundle.
 */
export function modeForPath(pathname: string, motionInRooms: boolean): SceneMode {
  if (pathname.startsWith("/rooms/")) return motionInRooms ? "calm" : "still";
  if (pathname === "/rooms") return "calm";
  return "full";
}

export function SceneHost() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useRef<AuroraController | null>(null);
  const pathname = usePathname();
  const [paused] = useLocalFlag("tuon-bg-paused", false);
  const [motionInRooms] = useLocalFlag("tuon-bg-in-rooms", false);

  // Latest values, read by the one-time setup below.
  const state = useRef({ mode: "full" as SceneMode, paused: false });
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  state.current = { mode: reduced ? "still" : modeForPath(pathname, motionInRooms), paused };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let observer: MutationObserver | undefined;

    void import("./aurora-scene").then(({ createAuroraScene }) => {
      if (cancelled) return;
      const isDark = () => document.documentElement.classList.contains("dark");
      const c = createAuroraScene(canvas, { dark: isDark(), ...state.current });
      if (!c) {
        canvas.style.display = "none";
        return;
      }
      controller.current = c;
      observer = new MutationObserver(() => c.setDark(isDark()));
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    controller.current?.setMode(state.current.mode);
    controller.current?.setPaused(state.current.paused);
  }, [pathname, paused, motionInRooms, reduced]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full transition-opacity duration-700" />;
}
