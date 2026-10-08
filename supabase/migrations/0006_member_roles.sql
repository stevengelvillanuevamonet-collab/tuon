-- 0006: room owners manage member roles.
-- Run after 0005. Safe to run more than once.
--
-- Roles:  owner   everything, plus managing members and deleting the room
--         editor  write notes, upload files, chat            (shown in the app as "Can edit")
--         member  read notes and files, watch edits live, chat (shown in the app as "Can view")

-- ───────── What new people get when they join ─────────
-- Chosen by the owner. Existing rooms keep today's behaviour (everyone who joins can edit).

alter table public.rooms add column if not exists default_role text not null default 'editor';
do $$ begin
  alter table public.rooms add constraint rooms_default_role_check check (default_role in ('editor', 'member'));
exception when duplicate_object then null; end $$;

create or replace function public.join_room_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; drole text;
begin
  if auth.uid() is null then raise exception 'Sign in to join a room'; end if;
  select id, default_role into rid, drole from public.rooms where invite_code = lower(trim(p_code));
  if rid is null then raise exception 'That invite code does not match any room'; end if;
  insert into public.room_members (room_id, user_id, role)
  values (rid, auth.uid(), drole) on conflict do nothing;
  return rid;
end $$;

create or replace function public.join_public_room(p_room_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare drole text;
begin
  if auth.uid() is null then raise exception 'Sign in to join a room'; end if;
  select default_role into drole from public.rooms where id = p_room_id and not is_private;
  if drole is null then
    raise exception 'This room is private. Ask a member for an invite link.';
  end if;
  insert into public.room_members (room_id, user_id, role)
  values (p_room_id, auth.uid(), drole) on conflict do nothing;
  return p_room_id;
end $$;

-- ───────── Guard rails on role changes ─────────
-- The policy already limits role changes to the owner. This also makes sure the owner's own role can't be
-- changed, nobody else can be promoted to owner, and a row can't be moved to another room or person.

create or replace function public.room_members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.room_id is distinct from old.room_id or new.user_id is distinct from old.user_id then
    raise exception 'A membership cannot be moved';
  end if;
  if new.role is distinct from old.role then
    if old.role = 'owner' then raise exception 'The owner''s role cannot be changed'; end if;
    if new.role = 'owner' then raise exception 'Ownership cannot be assigned this way'; end if;
  end if;
  return new;
end $$;

drop trigger if exists room_members_guard on public.room_members;
create trigger room_members_guard
  before update on public.room_members
  for each row execute function public.room_members_guard();

-- ───────── Live updates ─────────
-- So a role change shows up for the person it affects (and everyone else) straight away.
-- Removals are announced over the room channel instead, because Postgres can't filter delete events by room.

do $$ begin
  alter publication supabase_realtime add table public.room_members;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null; end $$;
