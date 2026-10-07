-- Notes become rich "Word-style" documents. The column now stores document HTML, so it is renamed from content_md to content.
-- Old markdown notes keep working: the app converts them to a document the first time they're opened.
-- Safe to run whether or not you've applied an earlier version of 0001 (it only renames if needed).

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notes' and column_name = 'content_md') then
    alter table public.notes rename column content_md to content;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'note_versions' and column_name = 'content_md') then
    alter table public.note_versions rename column content_md to content;
  end if;
end $$;

-- Rich documents are bigger than plain markdown, so allow more room (about 1 MB of HTML).
alter table public.notes drop constraint if exists notes_content_md_check;
alter table public.notes drop constraint if exists notes_content_check;
alter table public.notes add constraint notes_content_check check (char_length(content) <= 1000000);

-- Same trigger as before, now reading the renamed column.
create or replace function public.notes_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  last_snapshot timestamptz;
begin
  new.room_id := old.room_id;
  if new.content is distinct from old.content or new.title is distinct from old.title then
    select max(created_at) into last_snapshot from public.note_versions where note_id = old.id;
    if last_snapshot is null or last_snapshot < now() - interval '2 minutes' then
      insert into public.note_versions (note_id, version, title, content, saved_by)
      values (old.id, old.version, old.title, old.content, old.updated_by);
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
