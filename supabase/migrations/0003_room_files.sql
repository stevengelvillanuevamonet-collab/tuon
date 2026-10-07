-- Room files: PDF and PowerPoint uploads, private to each room's members.
-- Run after 0001 (and 0002). Safe to run more than once.

-- ───────── Table ─────────
create table if not exists public.room_files (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800), -- 50 MB
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists room_files_room_idx on public.room_files (room_id, created_at desc);

alter table public.room_files enable row level security;

drop policy if exists "files visible to members" on public.room_files;
create policy "files visible to members" on public.room_files for select to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "editors add files" on public.room_files;
create policy "editors add files" on public.room_files for insert to authenticated
  with check (uploaded_by = auth.uid() and public.room_role(room_id) in ('owner', 'editor'));

drop policy if exists "uploader or owner deletes files" on public.room_files;
create policy "uploader or owner deletes files" on public.room_files for delete to authenticated
  using (uploaded_by = auth.uid() or public.room_role(room_id) = 'owner');

-- live updates for everyone in the room
do $$ begin
  alter publication supabase_realtime add table public.room_files;
exception when duplicate_object then null; end $$;

-- ───────── Storage bucket (private) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-files', 'room-files', false, 52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'application/vnd.ms-powerpoint'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored as <room_id>/<file_id>.<ext>. This reads the room id out of the path (null if malformed).
create or replace function public.storage_room_id(object_name text)
returns uuid language plpgsql immutable as $$
begin
  return (string_to_array(object_name, '/'))[1]::uuid;
exception when others then
  return null;
end $$;

drop policy if exists "room files: members read" on storage.objects;
create policy "room files: members read" on storage.objects for select to authenticated
  using (bucket_id = 'room-files' and public.is_room_member(public.storage_room_id(name)));

drop policy if exists "room files: editors upload" on storage.objects;
create policy "room files: editors upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'room-files' and public.room_role(public.storage_room_id(name)) in ('owner', 'editor'));

drop policy if exists "room files: uploader or owner delete" on storage.objects;
create policy "room files: uploader or owner delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'room-files'
    and (
      -- the person who uploaded the object (also lets them clean up a failed upload)
      owner_id = auth.uid()::text
      -- or a room owner, via the file's row
      or exists (
        select 1 from public.room_files f
        where f.storage_path = storage.objects.name
          and (f.uploaded_by = auth.uid() or public.room_role(f.room_id) = 'owner')
      )
    )
  );
