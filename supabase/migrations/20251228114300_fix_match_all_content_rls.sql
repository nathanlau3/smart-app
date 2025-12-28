-- Fix RLS issue: match_all_content needs security definer to bypass RLS
-- This allows all authenticated users to search all documents and reports

create or replace function match_all_content(
  query_embedding vector(384),
  match_threshold float,
  match_count int default 10
)
returns table (
  id bigint,
  content text,
  source_type text,
  similarity float
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  -- Search documents
  select
    ds.id,
    ds.content,
    'document'::text as source_type,
    (1 - (ds.embedding <=> query_embedding))::float as similarity
  from document_sections ds
  where 1 - (ds.embedding <=> query_embedding) > match_threshold

  union all

  -- Search reports
  select
    re.id,
    re.searchable_content as content,
    'report'::text as source_type,
    (1 - (re.embedding <=> query_embedding))::float as similarity
  from report_embeddings re
  where 1 - (re.embedding <=> query_embedding) > match_threshold

  order by similarity desc
  limit match_count;
end;
$$;

-- Also fix match_reports function for consistency
create or replace function match_reports(
  query_embedding vector(384),
  match_threshold float,
  match_count int default 5
)
returns table (
  id bigint,
  report_id int,
  content text,
  similarity float
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select
    re.id,
    re.report_id,
    re.searchable_content as content,
    (1 - (re.embedding <=> query_embedding))::float as similarity
  from report_embeddings re
  where 1 - (re.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
