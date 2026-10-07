-- 0005: editable chat messages + live multi-user documents.
-- Run after 0004. Safe to run more than once.

-- ───────────────────────── Chat: edit your own messages ─────────────────────────

alter table public.messages add column if not exists edited_at timestamptz;

drop policy if exists "edit own messages" on public.messages;
create policy "edit own messages" on public.messages for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_room_member(room_id));

-- Only the text can change; the server stamps "edited".
create or replace function public.messages_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.room_id := old.room_id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  if new.body is distinct from old.body then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end $$;

drop trigger if exists messages_before_update on public.messages;
create trigger messages_before_update
  before update on public.messages
  for each row execute function public.messages_before_update();

-- ───────────────────────── Live documents ─────────────────────────
-- Everyone in a room can edit a note at the same time. Edits travel between browsers over a Realtime channel and
-- are merged as Yjs updates, so no one overwrites anyone. This table holds the merged state for people who open the
-- note later. It is kept apart from `notes` on purpose: it is never sent over the notes Realtime feed.

create table if not exists public.note_states (
  note_id uuid primary key references public.notes (id) on delete cascade,
  ydoc text not null check (char_length(ydoc) <= 8000000),
  rev integer not null default 1,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table public.note_states enable row level security;

drop policy if exists "note states visible to members" on public.note_states;
create policy "note states visible to members" on public.note_states for select to authenticated
  using (exists (select 1 from public.notes n where n.id = note_id and public.is_room_member(n.room_id)));

drop policy if exists "editors create note states" on public.note_states;
create policy "editors create note states" on public.note_states for insert to authenticated
  with check (exists (select 1 from public.notes n where n.id = note_id and public.room_role(n.room_id) in ('owner', 'editor')));

drop policy if exists "editors update note states" on public.note_states;
create policy "editors update note states" on public.note_states for update to authenticated
  using (exists (select 1 from public.notes n where n.id = note_id and public.room_role(n.room_id) in ('owner', 'editor')))
  with check (exists (select 1 from public.notes n where n.id = note_id and public.room_role(n.room_id) in ('owner', 'editor')));

-- ───────────────────────── Live channel access ─────────────────────────
-- Each open note uses a private Realtime channel named "note:<note id>". Only members of the note's room may listen,
-- and only owners and editors may publish (so view-only members can read along but can't push edits).

drop policy if exists "members listen to note channels" on realtime.messages;
create policy "members listen to note channels" on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1 from public.notes n
      where 'note:' || n.id::text = (select realtime.topic())
        and public.is_room_member(n.room_id)
    )
  );

drop policy if exists "editors publish to note channels" on realtime.messages;
create policy "editors publish to note channels" on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1 from public.notes n
      where 'note:' || n.id::text = (select realtime.topic())
        and public.room_role(n.room_id) in ('owner', 'editor')
    )
  );
