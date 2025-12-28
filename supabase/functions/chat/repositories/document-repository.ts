import { SupabaseClient } from "@supabase/supabase-js";
import type {
  DocumentFilters,
  DocumentInfo,
  DocumentSection,
  DocumentWithSections,
} from "../types/index.ts";

export class DocumentRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List all documents with section count
   */
  async listDocuments(filters?: DocumentFilters): Promise<DocumentInfo[]> {
    let query = this.supabase
      .from("documents")
      .select(
        `
        id,
        name,
        created_at,
        document_sections(id)
      `,
      )
      .order("created_at", { ascending: false });

    if (filters?.name) {
      query = query.ilike("name", `%${filters.name}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("List documents error:", error);
      throw new Error(error.message);
    }

    return (data || []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      created_at: doc.created_at,
      section_count: Array.isArray(doc.document_sections)
        ? doc.document_sections.length
        : 0,
    }));
  }

  /**
   * Get a specific document with all its sections
   */
  async getDocumentById(
    documentId: number,
  ): Promise<DocumentWithSections | null> {
    const { data, error } = await this.supabase
      .from("documents")
      .select(
        `
        id,
        name,
        created_at,
        document_sections(id, content)
      `,
      )
      .eq("id", documentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      console.error("Get document error:", error);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      name: data.name,
      created_at: data.created_at,
      sections: (data.document_sections || []).map(
        (s: { id: number; content: string }) => ({
          id: s.id,
          document_id: data.id,
          content: s.content,
        }),
      ),
    };
  }

  /**
   * Get document by name (fuzzy match)
   */
  async getDocumentByName(name: string): Promise<DocumentWithSections | null> {
    const { data, error } = await this.supabase
      .from("documents")
      .select(
        `
        id,
        name,
        created_at,
        document_sections(id, content)
      `,
      )
      .ilike("name", `%${name}%`)
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      console.error("Get document by name error:", error);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      name: data.name,
      created_at: data.created_at,
      sections: (data.document_sections || []).map(
        (s: { id: number; content: string }) => ({
          id: s.id,
          document_id: data.id,
          content: s.content,
        }),
      ),
    };
  }

  /**
   * Search document sections by keyword with document context
   */
  async searchDocumentSections(
    keyword: string,
    limit: number = 10,
  ): Promise<DocumentSection[]> {
    const { data, error } = await this.supabase
      .from("document_sections")
      .select(
        `
        id,
        document_id,
        content,
        documents!inner(name)
      `,
      )
      .ilike("content", `%${keyword}%`)
      .limit(limit);

    if (error) {
      console.error("Search document sections error:", error);
      throw new Error(error.message);
    }

    return (data || []).map((section) => ({
      id: section.id,
      document_id: section.document_id,
      content: section.content,
      document_name: (section.documents as unknown as { name: string } | null)
        ?.name,
    }));
  }

  /**
   * Get document summary (overview)
   */
  async getDocumentSummary(): Promise<{
    total_documents: number;
    total_sections: number;
    documents: DocumentInfo[];
  }> {
    const documents = await this.listDocuments();
    const totalSections = documents.reduce(
      (sum, doc) => sum + doc.section_count,
      0,
    );

    return {
      total_documents: documents.length,
      total_sections: totalSections,
      documents: documents.slice(0, 10), // Top 10 most recent
    };
  }
}
