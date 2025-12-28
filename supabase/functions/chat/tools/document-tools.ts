import { z } from "zod";
import { DocumentRepository } from "../repositories/document-repository.ts";

export function createDocumentTools(repository: DocumentRepository) {
  return {
    list_documents: {
      description:
        "List all uploaded documents. Use for questions like 'what documents do I have', 'show my files', 'dokumen apa saja yang ada'. Can filter by document name.",
      parameters: z.object({
        name: z
          .string()
          .optional()
          .describe("Filter by document name (partial match)"),
      }),
      execute: async (params: { name?: string }) => {
        console.log("Executing list_documents tool with filters:", params);
        try {
          const documents = await repository.listDocuments(params);
          return {
            documents,
            total: documents.length,
            filters: params,
          };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    },

    get_document_content: {
      description:
        "Get the content of a specific document. Use when user asks about a specific document by name, or wants to see what a document contains. Use this for questions like 'what does [document] say about', 'show me [document]', 'isi dokumen [nama]'. Content is truncated to prevent overflow.",
      parameters: z.object({
        document_name: z
          .string()
          .describe(
            "Name of the document to retrieve (partial match supported)",
          ),
        section_limit: z
          .number()
          .optional()
          .describe("Maximum number of sections to return (default: 5)"),
      }),
      execute: async (params: {
        document_name: string;
        section_limit?: number;
      }) => {
        console.log("Executing get_document_content tool:", params);
        try {
          const document = await repository.getDocumentByName(
            params.document_name,
          );

          if (!document) {
            return {
              error: `Document matching "${params.document_name}" not found`,
              suggestion: "Use list_documents to see available documents",
            };
          }

          // Limit sections to prevent context overflow (default 5)
          const maxSections = params.section_limit || 5;
          const sections = document.sections.slice(0, maxSections);

          // Truncate each section to max 1000 characters
          const truncatedContent = sections
            .map((s) => {
              const content = s.content;
              return content.length > 1000
                ? content.substring(0, 1000) + "...[truncated]"
                : content;
            })
            .join("\n\n---\n\n");

          return {
            document_name: document.name,
            document_id: document.id,
            created_at: document.created_at,
            total_sections: document.sections.length,
            sections_returned: sections.length,
            note:
              sections.length < document.sections.length
                ? `Showing ${sections.length} of ${document.sections.length} sections. Use section_limit parameter for more.`
                : undefined,
            content: truncatedContent,
          };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    },

    search_in_documents: {
      description:
        "Search for specific content within all documents. Use for questions like 'find [keyword] in my documents', 'which document mentions [topic]', 'cari [kata kunci] di dokumen'.",
      parameters: z.object({
        keyword: z
          .string()
          .describe("Keyword or phrase to search for in document content"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of results (default 10)"),
      }),
      execute: async (params: { keyword: string; limit?: number }) => {
        console.log("Executing search_in_documents tool:", params);
        try {
          const sections = await repository.searchDocumentSections(
            params.keyword,
            params.limit || 10,
          );

          // Group by document
          const byDocument: Record<
            string,
            { document_name: string; matches: string[] }
          > = {};
          for (const section of sections) {
            const docName =
              section.document_name || `Document ${section.document_id}`;
            if (!byDocument[docName]) {
              byDocument[docName] = { document_name: docName, matches: [] };
            }
            // Truncate content for readability
            const preview =
              section.content.length > 300
                ? section.content.substring(0, 300) + "..."
                : section.content;
            byDocument[docName].matches.push(preview);
          }

          return {
            keyword: params.keyword,
            total_matches: sections.length,
            results: Object.values(byDocument),
          };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    },

    get_documents_summary: {
      description:
        "Get an overview/summary of all documents. Use for questions like 'summarize my documents', 'ringkasan dokumen', 'document overview', 'how many documents do I have'.",
      parameters: z.object({}),
      execute: async () => {
        console.log("Executing get_documents_summary tool");
        try {
          const summary = await repository.getDocumentSummary();
          return summary;
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    },
  };
}
