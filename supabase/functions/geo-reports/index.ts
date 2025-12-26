import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

/**
 * Fetches reports with geo-data for map visualization
 *
 * Usage:
 * POST /functions/v1/geo-reports
 * Body: {
 *   "category_id": 1,           // Optional: filter by category
 *   "polda_id": 1,              // Optional: filter by polda
 *   "bounds": {                 // Optional: viewport bounding box
 *     "north": -6.0,
 *     "south": -7.0,
 *     "east": 107.0,
 *     "west": 106.0
 *   }
 * }
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables." }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return new Response(
      JSON.stringify({ error: "No authorization header passed" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        authorization,
      },
    },
    auth: {
      persistSession: false,
    },
  });

  let filters: {
    category_id?: number;
    polda_id?: number;
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  } = {};

  try {
    filters = await req.json();
  } catch {
    // No filters provided, use defaults
  }

  // Build query for reports with lat/long
  let query = supabase
    .from("reports")
    .select(
      "id, code, description, latitude, longitude, report_category_id, report_category_name, report_category_color, officer_name, address, polda_id, polda_name, polres_name, created_at",
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  // Apply category filter
  if (filters.category_id) {
    query = query.eq("report_category_id", filters.category_id);
  }

  // Apply polda filter
  if (filters.polda_id) {
    query = query.eq("polda_id", filters.polda_id);
  }

  // Apply bounding box filter if provided
  if (filters.bounds) {
    const { north, south, east, west } = filters.bounds;
    query = query
      .gte("latitude", south)
      .lte("latitude", north)
      .gte("longitude", west)
      .lte("longitude", east);
  }

  // Limit results for performance
  query = query.limit(1000);

  const { data: reports, error: fetchError } = await query;

  if (fetchError) {
    console.error("Error fetching reports:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Convert to GeoJSON format for easy Mapbox integration
  const geojson = {
    type: "FeatureCollection",
    features: (reports || []).map((report) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [report.longitude, report.latitude],
      },
      properties: {
        id: report.id,
        code: report.code,
        description: report.description,
        category_id: report.report_category_id,
        category_name: report.report_category_name,
        category_color: report.report_category_color,
        officer_name: report.officer_name,
        address: report.address,
        polda_id: report.polda_id,
        polda_name: report.polda_name,
        polres_name: report.polres_name,
        created_at: report.created_at,
      },
    })),
  };

  // Also fetch category list for filters
  const { data: categories } = await supabase
    .from("reports")
    .select("report_category_id, report_category_name, report_category_color")
    .not("report_category_id", "is", null)
    .order("report_category_name");

  // Get unique categories
  const uniqueCategories = Array.from(
    new Map((categories || []).map((c) => [c.report_category_id, c])).values(),
  );

  // Fetch polda list for filters
  const { data: poldas } = await supabase
    .from("reports")
    .select("polda_id, polda_name")
    .not("polda_id", "is", null)
    .order("polda_name");

  // Get unique poldas
  const uniquePoldas = Array.from(
    new Map((poldas || []).map((p) => [p.polda_id, p])).values(),
  );

  return new Response(
    JSON.stringify({
      geojson,
      categories: uniqueCategories,
      poldas: uniquePoldas,
      total_count: reports?.length || 0,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
});
