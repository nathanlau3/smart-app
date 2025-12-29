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
        console.warn(
          `Unknown LLM type: ${this.llmType}, defaulting to gpt-3.5-turbo`,
        );
        return this.openaiProvider("gpt-3.5-turbo");
    }
  }

  /**
   * Returns model-specific parameters for streaming
   */
  getModelParams(): { temperature: number; maxTokens: number } {
    switch (this.llmType) {
      case "gpt-3.5-turbo":
        return {
          temperature: 0, // Precise, deterministic
          maxTokens: 1024,
        };
      case "llama3.1":
        return {
          temperature: 0.7, // Warmer, more creative
          maxTokens: 2048, // Allow longer responses
        };
      default:
        return {
          temperature: 0,
          maxTokens: 1024,
        };
    }
  }
}
