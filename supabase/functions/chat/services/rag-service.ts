import { SupabaseClient } from "@supabase/supabase-js";
import type { Document } from "../types/index.ts";

export class RAGService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Detect source type based on keywords in the user query
   * @returns 'document' | 'report' | null (null means search all)
   */
  private detectSourceType(query: string): "document" | "report" | null {
    const lowerQuery = query.toLowerCase();

    const reportKeywords = [
      "report",
      "laporan",
      "k3i",
      "polisi",
      "police",
      "kejadian",
      "incident",
      "kriminal",
      "criminal",
    ];
    const documentKeywords = [
      "document",
      "dokumen",
      "file",
      "upload",
      "uploaded",
      "pdf",
      "sim",
      "SIM",
    ];

    const hasReportKeyword = reportKeywords.some((kw) =>
      lowerQuery.includes(kw),
    );
    const hasDocumentKeyword = documentKeywords.some((kw) =>
      lowerQuery.includes(kw),
    );

    if (hasReportKeyword && !hasDocumentKeyword) return "report";
    if (hasDocumentKeyword && !hasReportKeyword) return "document";
    return null; // Search all sources
  }

  async searchDocuments(
    embeddings: number[][],
    userQuery: string,
    matchThreshold: number = 0.3,
    matchCount: number = 10, // Increased for better context coverage
  ): Promise<Document[]> {
    const sourceType = this.detectSourceType(userQuery);

    console.log(
      `[RAG] Detected source type: ${
        sourceType ?? "all"
      } for query: "${userQuery.substring(0, 50)}..."`,
    );

    // Select the appropriate RPC based on source type
    const getRpcName = (type: "document" | "report" | null): string => {
      switch (type) {
        case "document":
          return "match_documents";
        case "report":
          return "match_reports";
        default:
          return "match_all_content";
      }
    };

    const rpcName = getRpcName(sourceType);
    console.log(`[RAG] Using RPC: ${rpcName}`);

    const searchPromises = embeddings.map((embedding) =>
      this.supabase
        .rpc(rpcName, {
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

    const _docCount = documents.filter(
      (d) => d.source_type === "document",
    ).length;
    const _reportCount = documents.filter(
      (d) => d.source_type === "report",
    ).length;

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
      maxLength: number = 2500,
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
