
import { z } from "zod";
import { ReportRepository } from "../repositories/report-repository.ts";

export function createReportTools(repository: ReportRepository) {
  return {
    count_reports: {
      description:
        "Count total number of reports in the database. Use for questions like 'how many reports', 'berapa jumlah laporan', 'total laporan'. Can filter by category, location (polda/polres), or officer name.",
      parameters: z.object({
        category: z
          .string()
          .optional()
          .describe("Filter by report category name (e.g., 'Pungli', 'Premanisme')"),
        polda_name: z.string().optional().describe("Filter by Polda name"),
        polres_name: z.string().optional().describe("Filter by Polres name"),
        officer_name: z.string().optional().describe("Filter by officer name"),
      }),
      execute: async (params: {
        category?: string;
        polda_name?: string;
        polres_name?: string;
        officer_name?: string;
      }) => {
        console.log("Executing count_reports tool with filters:", params);
        try {
          const count = await repository.countReports(params);
          return { count, filters: params };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    },

    get_report_stats: {
      description:
        "Get aggregated statistics about reports. Use for questions about report distribution, top categories, top locations, rankings, etc.",
      parameters: z.object({
        group_by: z
          .enum(["category", "polda", "polres", "officer"])
          .describe("What to group the reports by"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of results to return (default 10)"),
      }),
      execute: async (params: { group_by: string; limit?: number }) => {
        console.log("Executing get_report_stats tool:", params);
        try {
          const stats = await repository.getReportStats(
            params.group_by as "category" | "polda" | "polres" | "officer",
            params.limit || 10,
          );
          return {
            group_by: params.group_by,
            stats,
            total_groups: stats.length,
          };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    },

    get_report_summary: {
      description:
        "Get comprehensive summary of reports including total count, top categories, top locations, and recent reports. Use for questions like 'summary of reports', 'ringkasan laporan', 'overview', 'what's happening'.",
      parameters: z.object({
        category: z.string().optional().describe("Filter by category"),
        polda_name: z.string().optional().describe("Filter by Polda name"),
        polres_name: z.string().optional().describe("Filter by Polres name"),
        officer_name: z.string().optional().describe("Filter by officer name"),
      }),
      execute: async (params: {
        category?: string;
        polda_name?: string;
        polres_name?: string;
        officer_name?: string;
      }) => {
        console.log("Executing get_report_summary tool:", params);
        try {
          const summary = await repository.getReportSummary(params);
          return {
            ...summary,
            filters: params,
          };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    },

    search_reports: {
      description:
        "Search and retrieve detailed report information. Use when user asks for specific report details, descriptions, or wants to see actual reports.",
      parameters: z.object({
        category: z.string().optional().describe("Filter by category"),
        polda_name: z.string().optional().describe("Filter by Polda name"),
        polres_name: z.string().optional().describe("Filter by Polres name"),
        officer_name: z.string().optional().describe("Filter by officer name"),
      }),
      execute: async (params: {
        category?: string;
        polda_name?: string;
        polres_name?: string;
        officer_name?: string;
      }) => {
        console.log("Executing search_reports tool:", params);
        try {
          const reports = await repository.getReportsByFilters(params);
          return {
            reports: reports.slice(0, 10), // Limit to 10 reports
            total: reports.length,
            filters: params,
          };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    },

    analyze_trends: {
      description:
        "Analyze trends across multiple dimensions. Use for comparative questions like 'compare categories', 'trend analysis', 'which is most/least', 'distribution across locations'.",
      parameters: z.object({
        dimensions: z
          .array(z.enum(["category", "polda", "polres", "officer"]))
          .describe("Dimensions to analyze"),
        limit: z
          .number()
          .optional()
          .describe("Results per dimension (default 5)"),
      }),
      execute: async (params: {
        dimensions: ("category" | "polda" | "polres" | "officer")[];
        limit?: number;
      }) => {
        console.log("Executing analyze_trends tool:", params);
        try {
          const limit = params.limit || 5;
          const results: Record<string, unknown> = {};

          for (const dimension of params.dimensions) {
            results[dimension] = await repository.getReportStats(dimension, limit);
          }

          return {
            analysis: results,
            dimensions: params.dimensions,
          };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    },
  };
}
