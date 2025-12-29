-- Create match_documents function with consistent output format
-- This matches the output structure of match_reports and match_all_content

create or replace function match_documents(
  query_embedding vector(384),
  match_threshold float,
  match_count int default 5
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
  select
    ds.id,
    ds.content,
    'document'::text as source_type,
    (1 - (ds.embedding <=> query_embedding))::float as similarity
  from document_sections ds
  where 1 - (ds.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- Drop existing match_reports to change return type
drop function if exists match_reports(vector(384), float, int);
create or replace function match_reports(
  query_embedding vector(384),
  match_threshold float,
  match_count int default 5
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
