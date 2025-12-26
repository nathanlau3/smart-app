
import { createOpenAI } from "@ai-sdk/openai";
import type { LLMType } from "../types/index.ts";

export class LLMService {
  private openaiProvider: ReturnType<typeof createOpenAI>;
  private llamaProvider: ReturnType<typeof createOpenAI>;

  constructor(
    openaiApiKey: string,
    llamaBaseUrl: string,
    private llmType: LLMType,
  ) {
    this.openaiProvider = createOpenAI({
      apiKey: openaiApiKey || "",
    });

    this.llamaProvider = createOpenAI({
      baseURL: llamaBaseUrl || "http://localhost:11434/v1",
      apiKey: "ollama",
    });

    console.log("LLM Configuration:", {
      type: llmType,
      openaiAvailable: !!openaiApiKey,
      llamaBaseUrl: llamaBaseUrl || "http://localhost:11434/v1",
    });
  }

  getModel() {
    switch (this.llmType) {
      case "gpt-3.5-turbo":
        return this.openaiProvider("gpt-3.5-turbo");
      case "llama3.1":
        return this.llamaProvider("llama3.1");
      default:
        console.warn(`Unknown LLM type: ${this.llmType}, defaulting to gpt-3.5-turbo`);
        return this.openaiProvider("gpt-3.5-turbo");
    }
  }
}
