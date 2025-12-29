-- Add source_type filter parameter to match_all_content function
-- This allows keyword-based filtering instead of relying solely on similarity

create or replace function match_all_content(
  query_embedding vector(384),
  match_threshold float,
  match_count int default 10,
  filter_source_type text default null  -- New parameter: 'document', 'report', or null for all
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
  select * from (
    -- Search documents (only if filter is null or 'document')
    select
      ds.id,
      ds.content,
      'document'::text as source_type,
      (1 - (ds.embedding <=> query_embedding))::float as similarity
    from document_sections ds
    where 1 - (ds.embedding <=> query_embedding) > match_threshold
      and (filter_source_type is null or filter_source_type = 'document')

    union all

    -- Search reports (only if filter is null or 'report')
    select
      re.id,
      re.searchable_content as content,
      'report'::text as source_type,
      (1 - (re.embedding <=> query_embedding))::float as similarity
    from report_embeddings re
    where 1 - (re.embedding <=> query_embedding) > match_threshold
      and (filter_source_type is null or filter_source_type = 'report')
  ) combined
  order by similarity desc
  limit match_count;
end;
$$;
