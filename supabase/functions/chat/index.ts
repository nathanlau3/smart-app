import { createClient } from "@supabase/supabase-js";
import { streamText } from "ai";
import { loadConfig, corsHeaders } from "./lib/config.ts";
import { EmbeddingService } from "./services/embedding-service.ts";
import { RAGService } from "./services/rag-service.ts";
import { LLMService } from "./services/llm-service.ts";
import { ReportRepository } from "./repositories/report-repository.ts";
import { DocumentRepository } from "./repositories/document-repository.ts";
import { createReportTools } from "./tools/report-tools.ts";
import { createDocumentTools } from "./tools/document-tools.ts";
import { PromptBuilder } from "./lib/prompt-builder.ts";

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    console.log("url ------>", req.url);

    const config = loadConfig();

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header passed" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      global: { headers: { authorization } },
      auth: { persistSession: false },
    });

    const { messages } = await req.json();

    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage?.content || "";
    const previousMessage =
      messages.length > 1 ? messages[messages.length - 2]?.content : undefined;

    const embeddingService = new EmbeddingService(config.embeddingServiceUrl);
    const ragService = new RAGService(supabase);
    const llmService = new LLMService(
      config.openaiApiKey,
      config.llamaBaseUrl,
      config.llmType,
    );

    const reportRepository = new ReportRepository(supabase);
    const documentRepository = new DocumentRepository(supabase);

    const queryVariations = embeddingService.generateQueryVariations(
      userQuery,
      previousMessage,
    );

    const embeddings = await embeddingService.generateEmbeddings(
      queryVariations,
    );

    const documents = await ragService.searchDocuments(embeddings, userQuery);
    const injectedDocs = ragService.formatDocumentsForPrompt(documents);

    const systemPrompt = PromptBuilder.buildSystemPrompt(injectedDocs);

    // Combine report and document tools
    const reportTools = createReportTools(reportRepository);
    const documentTools = createDocumentTools(documentRepository);
    const tools = { ...reportTools, ...documentTools };

    // Get model-specific parameters (temperature, maxTokens)
    const modelParams = llmService.getModelParams();

    const result = streamText({
      model: llmService.getModel(),
      system: systemPrompt,
      messages: messages,
      maxTokens: modelParams.maxTokens,
      temperature: modelParams.temperature,
      maxSteps: 5,
      tools,
    });

    return result.toDataStreamResponse({ headers: corsHeaders });
  } catch (error) {
    console.error("Unexpected error in chat function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred: " + errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
