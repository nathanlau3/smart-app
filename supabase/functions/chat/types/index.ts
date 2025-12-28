export type LLMType = "gpt-3.5-turbo" | "llama3.1";

export interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
  llmType: LLMType;
  embeddingServiceUrl: string;
  openaiApiKey: string;
  llamaBaseUrl: string;
}

export interface Document {
  id: number;
  content: string;
  source_type: string;
  similarity: number;
}

export interface ReportFilters {
  category?: string;
  polda_name?: string;
  polres_name?: string;
  officer_name?: string;
}

export interface ReportCountResult {
  count: number;
  filters: ReportFilters;
}

export interface ReportStats {
  name: string;
  count: number;
}

export interface ReportStatsResult {
  group_by: string;
  stats: ReportStats[];
  total_groups: number;
}

export interface Report {
  id: number;
  code: string;
  description: string;
  report_category_name: string;
  polda_name: string;
  polres_name: string;
  officer_name: string;
  created_at: string;
}

// Document-related types
export interface DocumentFilters {
  name?: string;
  keyword?: string;
}

export interface DocumentInfo {
  id: number;
  name: string;
  created_at: string;
  section_count: number;
}

export interface DocumentSection {
  id: number;
  document_id: number;
  content: string;
  document_name?: string;
}

export interface DocumentWithSections {
  id: number;
  name: string;
  created_at: string;
  sections: DocumentSection[];
}
