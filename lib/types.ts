// Hand-written row types. After connecting your project you can swap these for
// `supabase gen types typescript` output.

export type Role = "owner" | "editor" | "member";

export interface Profile {
  id: string;
  display_name: string;
  avatar_color: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  university: string;
}

export interface Room {
  id: string;
  course_id: string | null;
  name: string;
  description: string | null;
  invite_code: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
  /** Optional topic label (a class, certification, hobby…). */
  courses: Course | null;
}

export interface Member {
  user_id: string;
  role: Role;
  profiles: Profile;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface ChatMessage extends Message {
  pending?: boolean;
  failed?: boolean;
}

export interface Note {
  id: string;
  room_id: string;
  title: string;
  content_md: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface NoteVersion {
  id: string;
  version: number;
  title: string;
  content_md: string;
  created_at: string;
  profiles: { display_name: string } | null;
}

export interface PresenceMeta {
  user_id: string;
  name: string;
  color: string;
  editing: string | null;
  editing_since: number | null;
  online_at: number;
}

export type ActionState = { error?: string; message?: string } | undefined;
