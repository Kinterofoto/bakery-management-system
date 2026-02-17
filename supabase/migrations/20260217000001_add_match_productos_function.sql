-- Add match_productos function for product RAG matching
-- Same pattern as match_clientes but operates on productos_rag table

-- Ensure vector operators are available
SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION "public"."match_productos"(
  "match_count" integer,
  "query_embedding" "extensions"."vector",
  "filter" "jsonb" DEFAULT '{}'::"jsonb"
)
RETURNS TABLE(
  "id" "uuid",
  "content" "text",
  "metadata" "jsonb",
  "similarity" double precision
)
LANGUAGE "sql" STABLE
AS $$
  select
    productos.id,
    productos.content,
    productos.metadata,
    1 - (productos.embedding <=> query_embedding) as similarity
  from productos_rag productos
  where productos.metadata @> filter
  order by productos.embedding <=> query_embedding
  limit match_count;
$$;

ALTER FUNCTION "public"."match_productos"("match_count" integer, "query_embedding" "extensions"."vector", "filter" "jsonb") OWNER TO "postgres";
