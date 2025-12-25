
import { SupabaseClient } from "@supabase/supabase-js";
import type { ReportFilters, Report, ReportStats } from "../types/index.ts";

export class ReportRepository {
  constructor(private supabase: SupabaseClient) {}

  async countReports(filters: ReportFilters): Promise<number> {
    let query = this.supabase
      .from("reports")
      .select("*", { count: "exact", head: true });

    if (filters.category) {
      query = query.ilike("report_category_name", `%${filters.category}%`);
    }
    if (filters.polda_name) {
      query = query.ilike("polda_name", `%${filters.polda_name}%`);
    }
    if (filters.polres_name) {
      query = query.ilike("polres_name", `%${filters.polres_name}%`);
    }
    if (filters.officer_name) {
      query = query.ilike("officer_name", `%${filters.officer_name}%`);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Count error:", error);
      throw new Error(error.message);
    }

    return count || 0;
  }

  async getReportStats(
    groupBy: "category" | "polda" | "polres" | "officer",
    limit: number = 10,
  ): Promise<ReportStats[]> {
    const columnMap: Record<string, string> = {
      category: "report_category_name",
      polda: "polda_name",
      polres: "polres_name",
      officer: "officer_name",
    };

    const column = columnMap[groupBy];
    if (!column) {
      throw new Error("Invalid group_by parameter");
    }

    const { data, error } = await this.supabase
      .from("reports")
      .select(column);

    if (error) {
      console.error("Stats error:", error);
      throw new Error(error.message);
    }

    if (!data) {
      return [];
    }

    const counts: Record<string, number> = {};
    for (const row of data) {
      const value = (row as Record<string, string>)[column];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getReportsByFilters(filters: ReportFilters): Promise<Report[]> {
    let query = this.supabase
      .from("reports")
      .select("*");

    if (filters.category) {
      query = query.ilike("report_category_name", `%${filters.category}%`);
    }
    if (filters.polda_name) {
      query = query.ilike("polda_name", `%${filters.polda_name}%`);
    }
    if (filters.polres_name) {
      query = query.ilike("polres_name", `%${filters.polres_name}%`);
    }
    if (filters.officer_name) {
      query = query.ilike("officer_name", `%${filters.officer_name}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Query error:", error);
      throw new Error(error.message);
    }

    return (data as Report[]) || [];
  }

  async getReportSummary(filters: ReportFilters): Promise<{
    total: number;
    categories: ReportStats[];
    locations: ReportStats[];
    recentReports: Report[];
  }> {
    const [total, categories, locations, recentReports] = await Promise.all([
      this.countReports(filters),
      this.getReportStats("category", 5),
      this.getReportStats("polda", 5),
      this.getRecentReports(filters, 5),
    ]);

    return {
      total,
      categories,
      locations,
      recentReports,
    };
  }

  async getRecentReports(
    filters: ReportFilters,
    limit: number = 5,
  ): Promise<Report[]> {
    let query = this.supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.category) {
      query = query.ilike("report_category_name", `%${filters.category}%`);
    }
    if (filters.polda_name) {
      query = query.ilike("polda_name", `%${filters.polda_name}%`);
    }
    if (filters.polres_name) {
      query = query.ilike("polres_name", `%${filters.polres_name}%`);
    }
    if (filters.officer_name) {
      query = query.ilike("officer_name", `%${filters.officer_name}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Recent reports error:", error);
      throw new Error(error.message);
    }

    return (data as Report[]) || [];
  }
}
