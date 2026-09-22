-- Sentra: base tables `documents` and `chunks`.
--
-- Columns match the live Supabase schema. `chunks.filename` is added
-- separately by add_chunk_filename.sql (W5.1), so it is not created here.
--
-- Run this file FIRST, before the other files in backend/sql/.
-- Safe to re-run: every statement is guarded.

-- pgvector (or enable it in the dashboard: Database > Extensions > vector).
create extension if not exists vector with schema extensions;

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  filename    text not null,
  uploaded_by text,
  role        text not null,   -- department tag: admin | hr | legal | public
  created_at  timestamp default now()
);

create table if not exists public.chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  content     text not null,
  role        text not null,   -- same tag as the parent document
  embedding   vector(768),     -- gemini-embedding-001, truncated to 768 dims (MRL)
  created_at  timestamp default now()
);

-- `documents` has RLS on and NO policy, on purpose. Public clients (anon and
-- authenticated) get no rows from it; only the service key, used by ingest.py,
-- can read or write it. /query never reads `documents`: the filename lives on
-- `chunks`, protected by the chunks policy in rls_chunks_policy.sql.
alter table public.documents enable row level security;

-- Checks against a live database (run separately):
--   select conrelid::regclass as tbl, conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where connamespace = 'public'::regnamespace
--     and conrelid in ('public.documents'::regclass, 'public.chunks'::regclass);
--
--   select format_type(atttypid, atttypmod) from pg_attribute
--   where attrelid = 'public.chunks'::regclass and attname = 'embedding';  -- vector(768)


-- Chunks are protected from the moment the table exists.
-- The policy itself is created in rls_chunks_policy.sql.
alter table public.chunks enable row level security;

-- Privileges. New Supabase tables do not grant these automatically.
-- service_role: used by ingest.py and Models A and B (bypasses RLS).
grant select, insert, update, delete on public.documents, public.chunks to service_role;
-- authenticated: Model C reads chunks, filtered by the RLS policy.
grant select on public.chunks to authenticated;

-- Hardening: public roles get nothing beyond what they need.
-- (Revoking a privilege that is not held is a no-op, so this is safe to re-run.)
revoke references, trigger, truncate on public.documents, public.chunks from anon, authenticated;