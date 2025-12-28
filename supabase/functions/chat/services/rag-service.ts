import { SupabaseClient } from "@supabase/supabase-js";
import type { Document } from "../types/index.ts";

export class RAGService {
  constructor(private supabase: SupabaseClient) {}

  async searchDocuments(
    embeddings: number[][],
    matchThreshold: number = 0.3,
    matchCount: number = 5, // Reduced to prevent context overflow
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
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach((doc: Document) => {
          const key = `${doc.source_type}-${doc.id}`;
          if (!documentMap.has(key)) {
            documentMap.set(key, doc);
          }
        });
      }
    });

    const documents = Array.from(documentMap.values());

    const docCount = documents.filter(
      (d) => d.source_type === "document",
    ).length;
    const reportCount = documents.filter(
      (d) => d.source_type === "report",
    ).length;

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

    // Truncate content to prevent context overflow
    const truncateContent = (
      content: string,
      maxLength: number = 500,
    ): string => {
      if (content.length <= maxLength) return content;
      return content.substring(0, maxLength) + "...[truncated]";
    };

    // Separate by source type for clarity
    const docResults = documents.filter((d) => d.source_type === "document");
    const reportResults = documents.filter((d) => d.source_type === "report");

    const parts: string[] = [];

    if (docResults.length > 0) {
      parts.push("=== FROM UPLOADED DOCUMENTS ===");
      parts.push(
        docResults
          .map(({ content }) => truncateContent(content))
          .join("\n\n---\n\n"),
      );
    }

    if (reportResults.length > 0) {
      parts.push("=== FROM POLICE REPORTS (K3I) ===");
      parts.push(
        reportResults
          .map(({ content }) => truncateContent(content))
          .join("\n\n---\n\n"),
      );
    }

    return parts.join("\n\n");
  }
}
