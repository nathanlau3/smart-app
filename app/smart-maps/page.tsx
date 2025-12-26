"use client";

import { useState, useCallback, useMemo } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import type { MapRef, ViewStateChangeEvent } from "react-map-gl/mapbox";
import {
  useGeoReports,
  type GeoReport,
  type GeoReportsFilters,
} from "@/hooks/useGeoReports";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MapPin,
  Layers,
  Filter,
  X,
  ChevronDown,
  Loader2,
  MapIcon,
  User,
  Calendar,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Indonesia center coordinates
const INITIAL_VIEW_STATE = {
  longitude: 117.0,
  latitude: -2.5,
  zoom: 4.5,
};

// Category colors fallback
const DEFAULT_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

// Heatmap layer style
const heatmapLayer = {
  id: "reports-heat",
  type: "heatmap" as const,
  source: "reports",
  paint: {
    "heatmap-weight": 1,
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(33,102,172,0)",
      0.2,
      "rgb(103,169,207)",
      0.4,
      "rgb(209,229,240)",
      0.6,
      "rgb(253,219,199)",
      0.8,
      "rgb(239,138,98)",
      1,
      "rgb(178,24,43)",
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
    "heatmap-opacity": 0.8,
  },
};

export default function SmartMapsPage() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [filters, setFilters] = useState<GeoReportsFilters>({});
  const [selectedReport, setSelectedReport] = useState<GeoReport | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [mapRef, setMapRef] = useState<MapRef | null>(null);

  const { data, isLoading, error, refetch } = useGeoReports(filters);

  const handleViewStateChange = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  }, []);

  const handleCategoryFilter = useCallback((categoryId: number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      category_id: categoryId,
    }));
  }, []);

  const handlePoldaFilter = useCallback((poldaId: number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      polda_id: poldaId,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const getCategoryColor = useCallback((report: GeoReport, index: number) => {
    return (
      report.properties.category_color ||
      DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    );
  }, []);

  // Group reports by category for legend
  type CategoryStat = {
    id: number;
    name: string;
    color: string;
    count: number;
  };

  const categoryStats = useMemo((): CategoryStat[] => {
    if (!data?.geojson?.features) return [];

    const stats: Record<
      number,
      { name: string; color: string; count: number }
    > = {};

    data.geojson.features.forEach((feature, idx) => {
      const { category_id, category_name, category_color } = feature.properties;
      if (category_id) {
        const existing = stats[category_id];
        if (existing) {
          existing.count++;
        } else {
          stats[category_id] = {
            name: category_name || "Unknown",
            color:
              category_color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
            count: 1,
          };
        }
      }
    });

    return Object.entries(stats)
      .map(([id, stat]) => ({ id: Number(id), ...stat }))
      .sort((a, b) => b.count - a.count);
  }, [data?.geojson?.features]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">
              Mapbox Token Missing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please add{" "}
              <code className="bg-muted px-1 rounded">
                NEXT_PUBLIC_MAPBOX_TOKEN
              </code>{" "}
              to your <code className="bg-muted px-1 rounded">.env.local</code>{" "}
              file.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Get your token at{" "}
              <a
                href="https://www.mapbox.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                mapbox.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <Map
        ref={(ref) => setMapRef(ref)}
        {...viewState}
        onMove={handleViewStateChange}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="bottom-right" />

        {/* Heatmap Layer */}
        {showHeatmap && data?.geojson && (
          <Source id="reports" type="geojson" data={data.geojson}>
            <Layer {...heatmapLayer} />
          </Source>
        )}

        {/* Markers (only when not showing heatmap) */}
        {!showHeatmap &&
          data?.geojson?.features.map((feature, idx) => (
            <Marker
              key={feature.properties.id}
              longitude={feature.geometry.coordinates[0]}
              latitude={feature.geometry.coordinates[1]}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedReport(feature);
              }}
            >
              <div
                className="cursor-pointer transform hover:scale-110 transition-transform"
                style={{
                  color: getCategoryColor(feature, idx),
                }}
              >
                <MapPin
                  className="w-6 h-6 drop-shadow-lg"
                  fill="currentColor"
                />
              </div>
            </Marker>
          ))}

        {/* Popup */}
        {selectedReport && (
          <Popup
            longitude={selectedReport.geometry.coordinates[0]}
            latitude={selectedReport.geometry.coordinates[1]}
            anchor="top"
            onClose={() => setSelectedReport(null)}
            closeButton={false}
            className="report-popup"
            maxWidth="280px"
          >
            <div className="bg-card text-foreground rounded-lg shadow-xl border border-border overflow-hidden">
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-sm font-medium block truncate">
                      {selectedReport.properties.code ||
                        `#${selectedReport.properties.id}`}
                    </span>
                    <span
                      className="inline-block mt-1 px-2 py-0.5 text-xs rounded max-w-full truncate"
                      style={{
                        backgroundColor: `${selectedReport.properties.category_color}20`,
                        color:
                          selectedReport.properties.category_color || "inherit",
                      }}
                    >
                      {selectedReport.properties.category_name ||
                        "Uncategorized"}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3 mb-2 break-words">
                  {selectedReport.properties.description || "No description"}
                </p>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {selectedReport.properties.officer_name && (
                    <div className="flex items-start gap-2">
                      <User className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="break-words min-w-0">
                        {selectedReport.properties.officer_name}
                      </span>
                    </div>
                  )}
                  {selectedReport.properties.polda_name && (
                    <div className="flex items-start gap-2">
                      <Building className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="break-words min-w-0">
                        {selectedReport.properties.polda_name}
                        {selectedReport.properties.polres_name &&
                          ` - ${selectedReport.properties.polres_name}`}
                      </span>
                    </div>
                  )}
                  {selectedReport.properties.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="break-words min-w-0 line-clamp-2">
                        {selectedReport.properties.address}
                      </span>
                    </div>
                  )}
                  {selectedReport.properties.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {new Date(
                          selectedReport.properties.created_at,
                        ).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Header Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-4 pointer-events-none">
        {/* Title & Stats */}
        <Card className="pointer-events-auto bg-card/90 backdrop-blur-sm">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Smart Maps</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading reports...
                </span>
              ) : error ? (
                <span className="text-destructive">Error loading reports</span>
              ) : (
                `${data?.total_count || 0} reports displayed`
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            variant={showHeatmap ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="bg-card/90 backdrop-blur-sm"
          >
            <Layers className="w-4 h-4 mr-2" />
            {showHeatmap ? "Show Markers" : "Show Heatmap"}
          </Button>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-card/90 backdrop-blur-sm"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {(filters.category_id || filters.polda_id) && (
              <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="absolute top-20 right-4 w-72 bg-card/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Filter Reports</CardTitle>
            <button
              onClick={() => setShowFilters(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Category Filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Category
              </label>
              <div className="relative">
                <select
                  value={filters.category_id || ""}
                  onChange={(e) =>
                    handleCategoryFilter(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className="w-full h-9 px-3 pr-8 text-sm bg-background border border-border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Categories</option>
                  {data?.categories?.map((cat) => (
                    <option
                      key={cat.report_category_id}
                      value={cat.report_category_id}
                    >
                      {cat.report_category_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Polda Filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Polda
              </label>
              <div className="relative">
                <select
                  value={filters.polda_id || ""}
                  onChange={(e) =>
                    handlePoldaFilter(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className="w-full h-9 px-3 pr-8 text-sm bg-background border border-border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Polda</option>
                  {data?.poldas?.map((polda) => (
                    <option key={polda.polda_id} value={polda.polda_id}>
                      {polda.polda_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Clear Filters */}
            {(filters.category_id || filters.polda_id) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full text-muted-foreground"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {categoryStats.length > 0 && !showHeatmap && (
        <Card className="absolute bottom-8 left-4 max-w-[200px] bg-card/95 backdrop-blur-sm">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-muted-foreground">
              Legend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5 max-h-[200px] overflow-y-auto">
            {categoryStats.slice(0, 8).map((cat) => (
              <div
                key={cat.id}
                className={cn(
                  "flex items-center justify-between gap-2 text-xs cursor-pointer rounded px-1 py-0.5 transition-colors",
                  filters.category_id === cat.id
                    ? "bg-primary/10"
                    : "hover:bg-muted/50",
                )}
                onClick={() =>
                  handleCategoryFilter(
                    filters.category_id === cat.id ? undefined : cat.id,
                  )
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate text-foreground/80">
                    {cat.name}
                  </span>
                </div>
                <span className="text-muted-foreground flex-shrink-0">
                  {cat.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
