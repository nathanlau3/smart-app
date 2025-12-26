
import type { Config, LLMType } from "../types/index.ts";

export function loadConfig(): Config {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    llmType: (Deno.env.get("LLM_TYPE") as LLMType) || "gpt-3.5-turbo",
    embeddingServiceUrl:
      Deno.env.get("EMBEDDING_SERVICE_URL") || "http://host.docker.internal:8001",
    openaiApiKey: Deno.env.get("OPENAI_API_KEY") || "",
    llamaBaseUrl: Deno.env.get("LLAMA_BASE_URL") || "http://localhost:11434/v1",
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
