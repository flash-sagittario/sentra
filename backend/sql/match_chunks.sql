-- Sentra: vector search used by POST /query for Models A, B and C.
--
-- Runs as the caller (no SECURITY DEFINER), so Row-Level Security on `chunks`
-- applies in Model C. Models A and B call it with the service key, which
-- bypasses RLS by design.
--
-- W5.1 change: returns `filename` so the answer can list its sources.
-- CREATE OR REPLACE cannot change the return columns, so drop first.
--
-- Already applied in Supabase. Kept here so the setup is reproducible.
-- Run add_chunk_filename.sql before this file.

drop function if exists public.match_chunks(vector, integer);

create function public.match_chunks(query_embedding vector, match_count integer)
 returns table(id uuid, document_id uuid, content text, role text, filename text, similarity double precision)
 language sql
 stable
as $function$
  select
    chunks.id,
    chunks.document_id,
    chunks.content,
    chunks.role,
    chunks.filename,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  order by chunks.embedding <=> query_embedding
  limit match_count;
$function$;
