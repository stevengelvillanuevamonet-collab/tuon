# Premium pass: what changed

Run `npm install` (adds `three` and `@types/three`), then `npm run dev`.

## New files
- `components/three/aurora-scene.ts`, `scene-host.tsx`: the Aurora background and its route-aware host
- `components/magic/`: `shiny-text`, `aurora-text`, `blur-text`, `number-ticker`, `magic-card`, `glowing-edge`, `tilt-card`, `dock`, `avatar-circles`, `animated-beam`
- `components/ui/`: `skeleton`, `progress`, `switch`
- `components/app/background-dock.tsx`: light/dark and pause dock on landing + auth
- `components/landing/presence-beam.tsx`: animated-beam version of "See who's here"
- `app/(app)/rooms/loading.tsx`, `app/(app)/rooms/[roomId]/loading.tsx`: skeleton loading states

## Edited files
- `app/layout.tsx` mounts `<SceneHost />`
- `app/globals.css`: aurora tokens, `glass` utility, `glow-edge`, new keyframes, body glow fallback
- `app/page.tsx`: shiny announcement, blur-in headline, tilt hero, aurora section title, dock. Removed the old DotPattern and Spotlight (they fought the aurora; the files are still in `components/magic`)
- `app/(auth)/layout.tsx`: glass form card + dock
- `app/(app)/rooms/page.tsx`: number tickers, spotlight + glowing-edge room cards, glass "open to join" list
- `components/ui/`: `tabs` (sliding pill), `dialog`, `command`, `sonner` (frosted glass)
- `components/magic/`: `shimmer-button` (hover glow), `bento-grid` (spotlight cards)
- `components/app/auth-showcase.tsx`: the sign-in/sign-up panel. No more solid navy: it sits on the same aurora as the form, the mini-room is frosted glass that tilts toward the cursor, and the "3 online" chip became an animated beam from the three people into the room
- `components/landing/bento.tsx`, `components/app/create-room-dialog.tsx` (Switch), `components/app/user-menu.tsx` (background switches), `components/app/app-shell.tsx` (sidebar blur), `components/room/presence-avatars.tsx`, `components/room/files-panel.tsx` (upload progress)
