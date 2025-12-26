
import { SupabaseClient } from "@supabase/supabase-js";
import type { Document } from "../types/index.ts";

export class RAGService {
  constructor(private supabase: SupabaseClient) {}

  async searchDocuments(
    embeddings: number[][],
    matchThreshold: number = 0.3,
    matchCount: number = 10,
  ): Promise<Document[]> {
    console.log(
      `Searching with ${embeddings.length} query variations, threshold ${matchThreshold}`,
    );

    const searchPromises = embeddings.map((embedding) =>
      this.supabase
        .rpc("match_all_content", {
          query_embedding: embedding,
          match_threshold: matchThreshold,
          match_count: matchCount,
        })
        .select("id, content, source_type, similarity"),
    );

    const searchResults = await Promise.all(searchPromises);

    const documentMap = new Map<string, Document>();
    searchResults.forEach((result) => {
      if (result.data) {
        result.data.forEach((doc: Document) => {
          const key = `${doc.source_type}-${doc.id}`;
          if (!documentMap.has(key)) {
            documentMap.set(key, doc);
          }
        });
      }
    });

    const documents = Array.from(documentMap.values());

    const docCount = documents.filter((d) => d.source_type === "document").length;
    const reportCount = documents.filter((d) => d.source_type === "report").length;

    console.log(
      "Multi-query retrieval - unique items found:",
      documents.length,
      `(${docCount} documents, ${reportCount} reports)`,
    );

    const matchError = searchResults.find((r) => r.error)?.error;
    if (matchError) {
      console.error("Match error details:", matchError);
      throw new Error("Error searching documents");
    }

    return documents;
  }

  formatDocumentsForPrompt(documents: Document[]): string {
    if (!documents || documents.length === 0) {
      return "No documents found";
    }

    return documents.map(({ content }) => content).join("\n\n");
  }
}
