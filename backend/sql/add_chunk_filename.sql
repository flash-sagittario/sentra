-- Sentra W5.1: store the source filename on each chunk.
--
-- Why on chunks and not a join to documents: in Model C the /query call runs
-- as the `authenticated` role, which has no SELECT on `documents`. Copying the
-- filename onto the chunk row means it is protected by the same RLS policy as
-- the chunk text, and no extra table is exposed.
--
-- Already applied in Supabase. Kept here so the setup is reproducible.

alter table public.chunks add column if not exists filename text;

-- Backfill chunks that were ingested before this column existed.
update public.chunks
set filename = documents.filename
from public.documents
where documents.id = chunks.document_id;

-- Check: should return 0.
-- select count(*) from chunks where filename is null;
