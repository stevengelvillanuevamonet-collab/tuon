# Tuon

Study rooms for anything you're learning: a class, an exam, a certification, a side project, or just yourself. Any email works for sign-up. Each room has live chat, shared markdown notes, presence ("who's here, who's editing what") and version history.

**Stack:** Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind v4 · shadcn/ui (Radix) · Supabase (Postgres, Auth, Realtime) · Vercel

## How the realtime parts work

One Supabase Realtime channel per room (`room:<id>`) carries three kinds of traffic:

| Feature | Realtime tool | Why |
| --- | --- | --- |
| Chat messages, note updates | **Postgres Changes** | Durable, and filtered by RLS so only members receive events |
| Who's online, who's editing which note | **Presence** | Ephemeral, no database writes |
| "Sam is typing…" | **Broadcast** | Ephemeral, lowest latency |

The browser talks to Supabase directly for realtime, so Vercel's lack of long-lived WebSocket servers doesn't matter. Server Actions handle auth, rooms and note saves.

**Chat** is optimistic. The client generates the message UUID, shows it immediately, and the Realtime echo with the same id confirms it. Failed sends show a Retry.

**Notes** use two layers so people don't overwrite each other:

1. **Soft lock via Presence.** The earliest person typing in a note holds it; everyone else sees a banner and a read-only editor. It releases ~6 s after they stop.
2. **Optimistic concurrency on save.** `saveNote` only applies if the note is still at the version the editor loaded. If not, the editor offers *Use their version* or *Keep mine*.

Postgres keeps checkpoints in `note_versions` (at most one every 2 minutes per note), which power version history and restore.

If you later need Google-Docs-style simultaneous typing, swap the textarea for CodeMirror + **Yjs** over Supabase Broadcast. The schema and presence layer stay as they are.

## UI components

- **shadcn/ui primitives** in `components/ui` (button, dialog, sheet, dropdown, command, resizable panels, scroll area, tabs, tooltip, sonner…).
- **Effects in `components/magic`**, written in the style of [Aceternity UI](https://ui.aceternity.com) and [Magic UI](https://magicui.design): `Spotlight`, `BorderBeam`, `ShimmerButton`, `BentoGrid`, `DotPattern`. They're self-contained, so you can replace any with the official version, e.g. `npx shadcn@latest add "https://magicui.design/r/border-beam"`.
- **The highlighter**: notes support `==text==` which renders as a marker highlight (a small remark plugin in `components/room/markdown.tsx`).

## Setup

```bash
npm install
cp .env.example .env.local        # add your Supabase URL + anon key
```

1. Create a Supabase project.
2. Run the migrations in `supabase/migrations/` in order (0001, then 0002, 0003, 0004, 0005) in the SQL editor. Each is safe to re-run. `0003` adds file uploads (PDF and PowerPoint) and a private storage bucket; `0004` turns notes into Word-style documents; `0005` adds editable chat messages and live multi-user documents (or `supabase db push`). It creates the tables, RLS policies, triggers, join functions and adds `messages` and `notes` to the Realtime publication.
3. **Auth → URL Configuration:** set Site URL to your app URL and add `http://localhost:3000/auth/callback` and your production `/auth/callback` to Redirect URLs.
4. For quick local testing you can turn off **Confirm email** under Auth → Providers → Email.
5. `npm run dev`

## Deploy to Vercel

Import the GitHub repo, add the three variables from `.env.example`, deploy. Add the Vercel URL to Supabase's redirect URLs.

## Layout

```
app/
  page.tsx                      landing
  (auth)/login, signup
  (app)/rooms                   dashboard
  (app)/rooms/[roomId]          workspace
  join/[code]                   invite links
  auth/callback                 email confirmation
components/
  ui/        shadcn primitives
  magic/     Aceternity / Magic UI-style effects
  landing/   hero demo, bento
  app/       shell, sidebar, ⌘K, dialogs
  room/      provider (realtime), chat, notes, presence, history
lib/
  actions/   server actions (auth, rooms, notes)
  supabase/  browser, server and middleware clients
supabase/migrations/            schema + RLS
```

## Security notes

- RLS is on for every table. Membership checks go through `security definer` helpers (`is_room_member`, `room_role`) so policies never recurse.
- Joining happens only through `join_room_by_code` / `join_public_room`; clients can't insert into `room_members`.
- Roles: `owner` and `editor` can write notes; `member` is read-only for notes but can chat. People who join get `editor`.
- Profiles (display name + colour) are readable by any signed-in user. Tighten this if that's too open for you.

## Brand

Logo files are in `public/brand/` (`logo-mark.svg`, `logo-mark.png` at 512px). The favicon is `app/icon.svg`. Use the PNG as your GitHub repo/organisation avatar.

## Vercel troubleshooting

`vercel.json` pins `"framework": "nextjs"`. If you ever see `MIDDLEWARE_INVOCATION_FAILED` with a log like *"Failed to load the ES module: /var/task/middleware.js"*, the project's Framework Preset has been set to something other than Next.js. Fix it under Settings → Build and Deployment → Framework Preset, leave Build Command / Output Directory on their defaults, and redeploy without build cache.

## Documents, files and viewers

- **Word-style documents.** Notes are rich documents (TipTap) with a ribbon, page canvas, tables, lists, fonts, colours and highlights. They export to a real `.docx` file (`lib/export-docx.ts`) and print or save to PDF from File → Print. Notes from earlier versions (markdown) are converted the first time they are opened.
- **Files.** PDF and PowerPoint files up to 50 MB are stored in the private `room-files` bucket, and only room members can read them. PDFs open in pdf.js. `.pptx` decks are drawn in the browser with `pptx-preview`; legacy `.ppt` files and any deck the browser can't draw fall back to Microsoft's online viewer, which only works on a public https address.
- **Local development.** Use `npm run dev` (the standard dev server). Turbopack's dev server currently can't load the `docx` library, so Word export only works with the standard server and in production.

## Live editing, chat and layout (migration 0005)

- **Everyone edits at once.** Notes are shared Yjs documents. Edits and cursors travel over a private Realtime channel per note (`note:<id>`) and are merged in place, with names above each cursor. Autosave sends the full document; the server merges it with the stored state (`note_states`), so simultaneous saves never overwrite each other. Older notes are converted the first time they're opened.
- **Access.** Only room members can listen on a note channel and only owners/editors can publish (policies on `realtime.messages`). View-only members watch live but can't send.
- **Chat.** You can edit and delete your own messages, load earlier history, mute the notification sound (remembered per device), and collapse the chat to a slim bar that shows unread messages.
- **Layout.** The sidebar collapses to an icon rail; the theme toggle sits beside the logo. In a room, *Split view* shows notes and files side by side (or stacked) so you can read while you write.
