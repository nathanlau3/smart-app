import { useQuery } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, useEffect } from "react";

export type GeoReport = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: number;
    code: string;
    description: string;
    category_id: number;
    category_name: string;
    category_color: string;
    officer_name: string;
    address: string;
    polda_id: number;
    polda_name: string;
    polres_name: string;
    created_at: string;
  };
};

export type GeoJSONData = {
  type: "FeatureCollection";
  features: GeoReport[];
};

export type Category = {
  report_category_id: number;
  report_category_name: string;
  report_category_color: string;
};

export type Polda = {
  polda_id: number;
  polda_name: string;
};

export type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type GeoReportsFilters = {
  category_id?: number;
  polda_id?: number;
  bounds?: Bounds;
};

export type GeoReportsResponse = {
  geojson: GeoJSONData;
  categories: Category[];
  poldas: Polda[];
  total_count: number;
};

async function fetchGeoReports(
  supabaseUrl: string,
  authToken: string,
  filters: GeoReportsFilters,
): Promise<GeoReportsResponse> {
  const response = await fetch(`${supabaseUrl}/functions/v1/geo-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(filters),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch geo reports");
  }

  return response.json();
}

export function useGeoReports(filters: GeoReportsFilters = {}) {
  const supabase = createClientComponentClient();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setAuthToken(session.access_token);
      }
    };
    getSession();
  }, [supabase]);

  return useQuery({
    queryKey: ["geo-reports", filters, authToken],
    queryFn: () => {
      if (!supabaseUrl || !authToken) {
        throw new Error("Not authenticated");
      }
      return fetchGeoReports(supabaseUrl, authToken, filters);
    },
    enabled: !!authToken && !!supabaseUrl,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });
}
