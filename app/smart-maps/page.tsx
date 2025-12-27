"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import type { MapRef, ViewStateChangeEvent } from "react-map-gl/mapbox";
import Supercluster from "supercluster";
import {
  useGeoReports,
  type GeoReport,
  type GeoReportsFilters,
} from "@/hooks/useGeoReports";
import { useReportStats, useSyncReports, useSyncPercentage } from "@/hooks";
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
  BarChart3,
  RefreshCw,
  Database,
  FileText,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const INITIAL_VIEW_STATE = {
  longitude: 117.0,
  latitude: -2.5,
  zoom: 4.5,
};

const DEFAULT_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

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

// Cluster component types
interface ClusterProperties {
  cluster: boolean;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string;
}

interface PointProperties {
  cluster: false;
  reportId: number;
  reportIndex: number;
}

type ClusterFeature = GeoJSON.Feature<GeoJSON.Point, ClusterProperties>;
type PointFeature = GeoJSON.Feature<GeoJSON.Point, PointProperties>;
type SuperclusterFeature = ClusterFeature | PointFeature;

export default function SmartMapsPage() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [filters, setFilters] = useState<GeoReportsFilters>({});
  const [selectedReport, setSelectedReport] = useState<GeoReport | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardPosition, setDashboardPosition] = useState<{
    side: "left" | "right" | "top" | "bottom";
    offset: number;
  }>({ side: "left", offset: 90 });
  const mapRef = useRef<MapRef | null>(null);

  const { data, isLoading, error } = useGeoReports(filters);

  // Create supercluster instance
  const supercluster = useMemo(() => {
    const cluster = new Supercluster<PointProperties, ClusterProperties>({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
    });
    return cluster;
  }, []);

  // Process points for clustering
  const points = useMemo(() => {
    if (!data?.geojson?.features) return [];
    return data.geojson.features.map((feature, index) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: feature.geometry.coordinates,
      },
      properties: {
        cluster: false as const,
        reportId: feature.properties.id,
        reportIndex: index,
      },
    }));
  }, [data?.geojson?.features]);

  // Load points into supercluster
  useMemo(() => {
    if (points.length > 0) {
      supercluster.load(points);
    }
  }, [supercluster, points]);

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    if (points.length === 0) return [];

    const bounds = mapRef.current?.getMap()?.getBounds();
    if (!bounds) {
      // Default bounds for Indonesia
      return supercluster.getClusters(
        [95, -11, 141, 6],
        Math.floor(viewState.zoom),
      );
    }

    return supercluster.getClusters(
      [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ],
      Math.floor(viewState.zoom),
    );
  }, [supercluster, points, viewState.zoom]);

  const handleViewStateChange = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  }, []);

  const handleCategoryFilter = useCallback((categoryId: number | undefined) => {
    setFilters((prev) => ({ ...prev, category_id: categoryId }));
  }, []);

  const handlePoldaFilter = useCallback((poldaId: number | undefined) => {
    setFilters((prev) => ({ ...prev, polda_id: poldaId }));
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

  // Handle cluster click - zoom in to expand
  const handleClusterClick = useCallback(
    (clusterId: number, longitude: number, latitude: number) => {
      const zoom = supercluster.getClusterExpansionZoom(clusterId);
      mapRef.current?.getMap()?.flyTo({
        center: [longitude, latitude],
        zoom: Math.min(zoom, 16),
        duration: 500,
      });
    },
    [supercluster],
  );

  // Get size for cluster based on point count
  const getClusterSize = (count: number) => {
    if (count < 10) return 35;
    if (count < 50) return 45;
    if (count < 100) return 55;
    return 65;
  };

  const categoryStats = useMemo(() => {
    if (!data?.geojson?.features) return [];
    const stats: Record<
      number,
      { name: string; color: string; count: number }
    > = {};
    data.geojson.features.forEach((feature, idx) => {
      const { category_id, category_name, category_color } = feature.properties;
      if (category_id) {
        if (stats[category_id]) {
          stats[category_id].count++;
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleViewStateChange}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="bottom-right" />

        {showHeatmap && data?.geojson && (
          <Source id="reports" type="geojson" data={data.geojson}>
            <Layer {...heatmapLayer} />
          </Source>
        )}

        {/* Clustered Markers */}
        {!showHeatmap &&
          clusters.map((cluster) => {
            const [longitude, latitude] = cluster.geometry.coordinates;
            const properties = cluster.properties;

            // Check if it's a cluster
            if (properties.cluster) {
              const clusterProps = properties as ClusterProperties;
              const size = getClusterSize(clusterProps.point_count);

              return (
                <Marker
                  key={`cluster-${clusterProps.cluster_id}`}
                  longitude={longitude}
                  latitude={latitude}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    handleClusterClick(
                      clusterProps.cluster_id,
                      longitude,
                      latitude,
                    );
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full cursor-pointer transition-all hover:scale-110 shadow-lg"
                    style={{
                      width: size,
                      height: size,
                      background:
                        "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)",
                      border: "3px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    <span className="text-white font-bold text-sm">
                      {clusterProps.point_count_abbreviated}
                    </span>
                  </div>
                </Marker>
              );
            }

            // Single point
            const pointProps = properties as PointProperties;
            const feature = data?.geojson?.features[pointProps.reportIndex];
            if (!feature) return null;

            return (
              <Marker
                key={`point-${pointProps.reportId}`}
                longitude={longitude}
                latitude={latitude}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedReport(feature);
                }}
              >
                <div
                  className="cursor-pointer transform hover:scale-110 transition-transform"
                  style={{
                    color: getCategoryColor(feature, pointProps.reportIndex),
                  }}
                >
                  <MapPin
                    className="w-6 h-6 drop-shadow-lg"
                    fill="currentColor"
                  />
                </div>
              </Marker>
            );
          })}

        {selectedReport && (
          <Popup
            longitude={selectedReport.geometry.coordinates[0]}
            latitude={selectedReport.geometry.coordinates[1]}
            anchor="top"
            onClose={() => setSelectedReport(null)}
            closeButton={false}
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
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                  {selectedReport.properties.description || "No description"}
                </p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {selectedReport.properties.officer_name && (
                    <div className="flex items-start gap-2">
                      <User className="w-3 h-3 mt-0.5" />
                      <span>{selectedReport.properties.officer_name}</span>
                    </div>
                  )}
                  {selectedReport.properties.polda_name && (
                    <div className="flex items-start gap-2">
                      <Building className="w-3 h-3 mt-0.5" />
                      <span>{selectedReport.properties.polda_name}</span>
                    </div>
                  )}
                  {selectedReport.properties.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(
                          selectedReport.properties.created_at,
                        ).toLocaleDateString("id-ID")}
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
                  Loading...
                </span>
              ) : error ? (
                <span className="text-destructive">Error loading</span>
              ) : (
                `${data?.total_count || 0} reports`
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            variant={showHeatmap ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="bg-card/90 backdrop-blur-sm"
          >
            <Layers className="w-4 h-4 mr-2" />
            {showHeatmap ? "Markers" : "Heatmap"}
          </Button>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-card/90 backdrop-blur-sm"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button
            variant={showLegend ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLegend(!showLegend)}
            className="bg-card/90 backdrop-blur-sm"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Legend
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
                  className="w-full h-9 px-3 pr-8 text-sm bg-background border border-border rounded-md appearance-none"
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
                  className="w-full h-9 px-3 pr-8 text-sm bg-background border border-border rounded-md appearance-none"
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
      {showLegend && categoryStats.length > 0 && !showHeatmap && (
        <Card className="absolute bottom-24 left-4 max-w-[200px] bg-card/95 backdrop-blur-sm">
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

      {/* Dashboard Trigger Button */}
      <DashboardTrigger
        onClick={() => setShowDashboard(true)}
        position={dashboardPosition}
        onPositionChange={setDashboardPosition}
      />

      {showDashboard && (
        <DashboardModal onClose={() => setShowDashboard(false)} />
      )}
    </div>
  );
}

// Dashboard Trigger Component - Draggable
interface EdgePosition {
  side: "left" | "right" | "top" | "bottom";
  offset: number;
}

function DashboardTrigger({
  onClick,
  position,
  onPositionChange,
}: {
  onClick: () => void;
  position: EdgePosition;
  onPositionChange: (pos: EdgePosition) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  const getPositionStyle = (): React.CSSProperties => {
    if (isDragging && dragPos) {
      return {
        left: dragPos.x - 28,
        top: dragPos.y - 28,
        transition: "none",
      };
    }

    const margin = 16;
    switch (position.side) {
      case "left":
        return {
          left: margin,
          top: `${position.offset}%`,
          transform: "translateY(-50%)",
        };
      case "right":
        return {
          right: margin,
          top: `${position.offset}%`,
          transform: "translateY(-50%)",
        };
      case "top":
        return {
          top: margin + 64,
          left: `${position.offset}%`,
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          bottom: margin,
          left: `${position.offset}%`,
          transform: "translateX(-50%)",
        };
    }
  };

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragStartRef.current = { x: clientX, y: clientY, time: Date.now() };
      setDragPos({ x: clientX, y: clientY });
      setIsDragging(true);
    },
    [],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setDragPos({ x: clientX, y: clientY });
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      const clientX =
        "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY =
        "changedTouches" in e ? e.changedTouches[0].clientY : e.clientY;

      // Check if it was just a click (short time, small movement)
      const start = dragStartRef.current;
      const isClick =
        start &&
        Date.now() - start.time < 200 &&
        Math.abs(clientX - start.x) < 10 &&
        Math.abs(clientY - start.y) < 10;

      if (isClick) {
        onClick();
      } else {
        // Calculate nearest edge
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const distToLeft = clientX;
        const distToRight = windowWidth - clientX;
        const distToTop = clientY;
        const distToBottom = windowHeight - clientY;
        const minDist = Math.min(
          distToLeft,
          distToRight,
          distToTop,
          distToBottom,
        );

        let newSide: EdgePosition["side"];
        let newOffset: number;

        if (minDist === distToLeft) {
          newSide = "left";
          newOffset = Math.max(
            10,
            Math.min(90, (clientY / windowHeight) * 100),
          );
        } else if (minDist === distToRight) {
          newSide = "right";
          newOffset = Math.max(
            10,
            Math.min(90, (clientY / windowHeight) * 100),
          );
        } else if (minDist === distToTop) {
          newSide = "top";
          newOffset = Math.max(10, Math.min(90, (clientX / windowWidth) * 100));
        } else {
          newSide = "bottom";
          newOffset = Math.max(10, Math.min(90, (clientX / windowWidth) * 100));
        }

        onPositionChange({ side: newSide, offset: newOffset });
      }

      setIsDragging(false);
      setDragPos(null);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, onClick, onPositionChange]);

  return (
    <button
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      style={getPositionStyle()}
      className={cn(
        "fixed z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white transition-all duration-300 group select-none",
        isDragging
          ? "scale-110 cursor-grabbing opacity-80"
          : "hover:from-blue-400 hover:to-blue-500 hover:scale-110 cursor-grab",
      )}
      title="Report Dashboard (drag to move)"
    >
      <BarChart3 className="w-6 h-6 group-hover:scale-110 transition-transform pointer-events-none" />
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-blue-500 pointer-events-none" />
    </button>
  );
}

// Dashboard Modal Component
function DashboardModal({ onClose }: { onClose: () => void }) {
  const { data: stats, isLoading: statsLoading } = useReportStats();
  const syncMutation = useSyncReports();
  const syncPercentage = useSyncPercentage();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-500/10 to-transparent border-b border-border backdrop-blur-xl">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Report Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Sync status and analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isLoading}
              variant="default"
              size="sm"
            >
              {syncMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync All
                </>
              )}
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Database}
              title="Total Reports"
              value={stats?.total_reports}
              loading={statsLoading}
            />
            <StatCard
              icon={FileText}
              title="Synced"
              value={stats?.synced_reports}
              loading={statsLoading}
              subtitle={`${syncPercentage}%`}
              valueColor="text-green-500"
            />
            <StatCard
              icon={Shield}
              title="Categories"
              value={stats?.total_categories}
              loading={statsLoading}
            />
            <StatCard
              icon={User}
              title="Officers"
              value={stats?.total_officers}
              loading={statsLoading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="Top Categories"
              data={stats?.reports_by_category}
              total={stats?.total_reports || 1}
              loading={statsLoading}
              labelKey="category"
              color="bg-primary"
            />
            <ChartCard
              title="Top Polda"
              data={stats?.reports_by_polda}
              total={stats?.total_reports || 1}
              loading={statsLoading}
              labelKey="polda"
              color="bg-blue-500"
            />
          </div>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {statsLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : (
                stats?.recent_reports?.slice(0, 5).map((report: any) => (
                  <div
                    key={report.id}
                    className="border-l-4 border-primary pl-3 py-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">
                        {report.code || `#${report.id}`}
                      </span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {report.report_category_name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {report.description}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  loading,
  subtitle,
  valueColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value?: number;
  loading: boolean;
  subtitle?: string;
  valueColor?: string;
}) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <div className={cn("text-2xl font-bold", valueColor)}>
          {loading ? "-" : value?.toLocaleString()}
        </div>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  data,
  total,
  loading,
  labelKey,
  color,
}: {
  title: string;
  data?: Array<{ category?: string; polda?: string; count: number }>;
  total: number;
  loading: boolean;
  labelKey: "category" | "polda";
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : (
          data?.slice(0, 5).map((item, idx) => {
            const label = labelKey === "category" ? item.category : item.polda;
            const percentage = (item.count / total) * 100;
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-sm truncate max-w-[140px]">
                  {label || "Unknown"}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full", color)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[30px] text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
