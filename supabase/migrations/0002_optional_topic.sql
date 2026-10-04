-- Rooms no longer have to belong to a course. The "course" is now an optional topic label.
-- Safe to run whether or not you've already applied 0001 (it's idempotent).
alter table public.rooms alter column course_id drop not null;
alter table public.rooms drop constraint if exists rooms_course_id_fkey;
alter table public.rooms
  add constraint rooms_course_id_fkey foreign key (course_id) references public.courses (id) on delete set null;
