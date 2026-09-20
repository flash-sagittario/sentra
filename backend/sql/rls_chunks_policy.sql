-- Sentra: Row-Level Security for Model C (retrieval-layer authorization).
--
-- Section 5A access matrix, enforced on `chunks`:
--   admin    -> admin, hr, legal, public (all rows)
--   hr       -> hr, public
--   legal    -> legal, public
--   employee -> public
--
-- The role is read from app_metadata in the JWT, which users cannot edit.
-- Do not use user_metadata here: it is user-editable.
--
-- Already applied in Supabase. Kept here so the setup is reproducible.
-- Safe to re-run.

alter table public.chunks enable row level security;

drop policy if exists role_based_chunk_access on public.chunks;

create policy role_based_chunk_access on public.chunks
for select to authenticated
using (
  role = 'public'
  or role = (auth.jwt() -> 'app_metadata' ->> 'role')
  or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);