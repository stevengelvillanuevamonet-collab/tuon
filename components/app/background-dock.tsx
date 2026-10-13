"use client";

import { Moon, Pause, Play, Sun } from "lucide-react";
import { useLocalFlag } from "@/lib/hooks/use-local-setting";
import { Dock, DockItem } from "@/components/magic/dock";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Small floating dock for the public pages (landing, sign in, sign up):
 * switch light and dark, and stop the background moving. Both choices are remembered.
 */
export function BackgroundDock() {
  const [paused, setPaused] = useLocalFlag("tuon-bg-paused", false);

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("tuon-theme", dark ? "dark" : "light");
    } catch {}
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Dock label="Appearance" className="pointer-events-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <DockItem onClick={toggleTheme} aria-label="Toggle light or dark mode">
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" />
            </DockItem>
          </TooltipTrigger>
          <TooltipContent side="top">Light / dark mode</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <DockItem onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Resume background motion" : "Pause background motion"}>
              {paused ? <Play /> : <Pause />}
            </DockItem>
          </TooltipTrigger>
          <TooltipContent side="top">{paused ? "Resume background" : "Pause background"}</TooltipContent>
        </Tooltip>
      </Dock>
    </div>
  );
}
