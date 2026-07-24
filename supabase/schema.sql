-- Run this in your Supabase project's SQL editor (or via `supabase db push`)
-- to create the table charla-app logs conversation activity to.
--
-- Note: the app also needs a `session_id` column beyond the columns
-- originally specified (id, created_at, level, role, char_count) — without
-- it there'd be no way to group the rows from a single conversation
-- together, which defeats the point of generating a session ID at all.

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  created_at timestamptz not null default now(),
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  role text not null check (role in ('user', 'assistant')),
  char_count integer not null check (char_count >= 0)
);

create index if not exists sessions_session_id_idx on sessions (session_id);
