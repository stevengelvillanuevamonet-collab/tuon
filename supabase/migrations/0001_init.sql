-- Tuon: schema, row level security, triggers, realtime
-- Run with `supabase db push`, or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

-- ───────────────────────── Tables ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_color text not null default '#2B44FF',
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null check (char_length(code) between 1 and 20),
  name text not null check (char_length(name) between 1 and 100),
  university text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (university, code)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null, -- optional topic label
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 280),
  invite_code text not null unique default encode(gen_random_bytes(5), 'hex'),
  is_private boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index rooms_course_id_idx on public.rooms (course_id);

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'member')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user_id_idx on public.room_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_room_created_idx on public.messages (room_id, created_at desc);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  title text not null default 'Untitled note' check (char_length(title) <= 120),
  content_md text not null default '' check (char_length(content_md) <= 200000),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
create index notes_room_id_idx on public.notes (room_id);

create table public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  version integer not null,
  title text not null,
  content_md text not null,
  saved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index note_versions_note_idx on public.note_versions (note_id, created_at desc);

-- ───────────────────────── Helpers ─────────────────────────
-- security definer so policies on room_members can ask "am I a member?"
-- without recursing into their own policy.

create or replace function public.is_room_member(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members where room_id = rid and user_id = auth.uid()
  );
$$;

create or replace function public.room_role(rid uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.room_members where room_id = rid and user_id = auth.uid();
$$;

-- ───────────────────────── Triggers ─────────────────────────

-- New auth user → profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  colors text[] := array['#2B44FF','#E5484D','#12A594','#F76B15','#8E4EC6','#0091FF','#D6409F','#30A46C'];
begin
  insert into public.profiles (id, display_name, avatar_color)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 40),
    colors[1 + abs(hashtext(new.id::text)) % array_length(colors, 1)]
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- New room → creator becomes owner
create or replace function public.handle_new_room()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.room_members (room_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end $$;

create trigger on_room_created
  after insert on public.rooms
  for each row execute function public.handle_new_room();

-- Notes: server owns version/updated_at/updated_by, and keeps periodic snapshots.
-- A snapshot of the *previous* state is stored when the last one is over 2 minutes old,
-- so autosave doesn't flood history but every editing burst leaves a checkpoint.
create or replace function public.notes_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  last_snapshot timestamptz;
begin
  new.room_id := old.room_id;
  if new.content_md is distinct from old.content_md or new.title is distinct from old.title then
    select max(created_at) into last_snapshot from public.note_versions where note_id = old.id;
    if last_snapshot is null or last_snapshot < now() - interval '2 minutes' then
      insert into public.note_versions (note_id, version, title, content_md, saved_by)
      values (old.id, old.version, old.title, old.content_md, old.updated_by);
    end if;
    new.version := old.version + 1;
    new.updated_at := now();
    new.updated_by := auth.uid();
  else
    new.version := old.version;
    new.updated_at := old.updated_at;
    new.updated_by := old.updated_by;
  end if;
  return new;
end $$;

create trigger notes_before_update
  before update on public.notes
  for each row execute function public.notes_before_update();

-- ───────────────────────── Join functions ─────────────────────────

create or replace function public.join_room_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to join a room'; end if;
  select id into rid from public.rooms where invite_code = lower(trim(p_code));
  if rid is null then raise exception 'That invite code does not match any room'; end if;
  insert into public.room_members (room_id, user_id, role)
  values (rid, auth.uid(), 'editor') on conflict do nothing;
  return rid;
end $$;

create or replace function public.join_public_room(p_room_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in to join a room'; end if;
  if not exists (select 1 from public.rooms where id = p_room_id and not is_private) then
    raise exception 'This room is private. Ask a member for an invite link.';
  end if;
  insert into public.room_members (room_id, user_id, role)
  values (p_room_id, auth.uid(), 'editor') on conflict do nothing;
  return p_room_id;
end $$;

revoke execute on function public.join_room_by_code(text) from public, anon;
revoke execute on function public.join_public_room(uuid) from public, anon;
grant execute on function public.join_room_by_code(text) to authenticated;
grant execute on function public.join_public_room(uuid) to authenticated;

-- ───────────────────────── Row level security ─────────────────────────

alter table public.profiles      enable row level security;
alter table public.courses       enable row level security;
alter table public.rooms         enable row level security;
alter table public.room_members  enable row level security;
alter table public.messages      enable row level security;
alter table public.notes         enable row level security;
alter table public.note_versions enable row level security;

-- profiles: display names are readable by signed-in users; you edit your own
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

-- courses: shared catalogue
create policy "courses readable" on public.courses for select to authenticated using (true);
create policy "courses insert" on public.courses for insert to authenticated with check (created_by = auth.uid());

-- rooms
create policy "rooms visible" on public.rooms for select to authenticated
  using (not is_private or public.is_room_member(id) or created_by = auth.uid());
create policy "rooms insert" on public.rooms for insert to authenticated with check (created_by = auth.uid());
create policy "rooms update by owner" on public.rooms for update to authenticated using (public.room_role(id) = 'owner');
create policy "rooms delete by owner" on public.rooms for delete to authenticated using (public.room_role(id) = 'owner');

-- room_members (joining goes through the join_* functions)
create policy "members visible to members" on public.room_members for select to authenticated
  using (public.is_room_member(room_id));
create policy "owner changes roles" on public.room_members for update to authenticated
  using (public.room_role(room_id) = 'owner');
create policy "leave or remove" on public.room_members for delete to authenticated
  using (user_id = auth.uid() or public.room_role(room_id) = 'owner');

-- messages
create policy "messages visible to members" on public.messages for select to authenticated
  using (public.is_room_member(room_id));
create policy "members send messages" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and public.is_room_member(room_id));
create policy "delete own messages" on public.messages for delete to authenticated
  using (user_id = auth.uid());

-- notes: every member reads; owners and editors write
create policy "notes visible to members" on public.notes for select to authenticated
  using (public.is_room_member(room_id));
create policy "editors create notes" on public.notes for insert to authenticated
  with check (public.room_role(room_id) in ('owner', 'editor'));
create policy "editors update notes" on public.notes for update to authenticated
  using (public.room_role(room_id) in ('owner', 'editor'))
  with check (public.room_role(room_id) in ('owner', 'editor'));
create policy "editors delete notes" on public.notes for delete to authenticated
  using (public.room_role(room_id) in ('owner', 'editor'));

-- note_versions: written by trigger only
create policy "versions visible to members" on public.note_versions for select to authenticated
  using (exists (select 1 from public.notes n where n.id = note_id and public.is_room_member(n.room_id)));

-- ───────────────────────── Realtime ─────────────────────────
alter publication supabase_realtime add table public.messages, public.notes;
