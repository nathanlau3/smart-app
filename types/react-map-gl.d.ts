// Type declarations for react-map-gl/mapbox
// This file provides type compatibility for react-map-gl v8 with Mapbox

declare module "react-map-gl/mapbox" {
  import * as React from "react";
  import mapboxgl from "mapbox-gl";

  export interface ViewState {
    longitude: number;
    latitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
    padding?: { top: number; bottom: number; left: number; right: number };
  }

  export interface ViewStateChangeEvent {
    viewState: ViewState;
    interactionState: Record<string, unknown>;
    oldViewState: ViewState;
  }

  export interface MapProps extends Partial<ViewState> {
    mapboxAccessToken?: string;
    mapStyle?: string | object;
    style?: React.CSSProperties;
    onMove?: (evt: ViewStateChangeEvent) => void;
    onLoad?: (evt: { target: mapboxgl.Map }) => void;
    onClick?: (evt: mapboxgl.MapMouseEvent) => void;
    children?: React.ReactNode;
  }

  export interface MapRef {
    getMap(): mapboxgl.Map;
    getCenter(): { lng: number; lat: number };
    getZoom(): number;
    getBearing(): number;
    getPitch(): number;
  }

  export interface MarkerProps {
    longitude: number;
    latitude: number;
    anchor?:
      | "top"
      | "bottom"
      | "left"
      | "right"
      | "center"
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right";
    onClick?: (evt: { originalEvent: MouseEvent }) => void;
    children?: React.ReactNode;
  }

  export interface PopupProps {
    longitude: number;
    latitude: number;
    anchor?:
      | "top"
      | "bottom"
      | "left"
      | "right"
      | "center"
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right";
    onClose?: () => void;
    closeButton?: boolean;
    closeOnClick?: boolean;
    className?: string;
    maxWidth?: string;
    children?: React.ReactNode;
  }

  export interface NavigationControlProps {
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    showCompass?: boolean;
    showZoom?: boolean;
    visualizePitch?: boolean;
  }

  export interface SourceProps {
    id: string;
    type: "geojson" | "vector" | "raster" | "image" | "video";
    data?: object;
    children?: React.ReactNode;
  }

  // Using any for complex Mapbox expressions to avoid type complexity
  export interface LayerProps {
    id?: string;
    type?:
      | "fill"
      | "line"
      | "symbol"
      | "circle"
      | "heatmap"
      | "fill-extrusion"
      | "raster"
      | "hillshade"
      | "background";
    source?: string;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    minzoom?: number;
    maxzoom?: number;
  }

  const Map: React.ForwardRefExoticComponent<
    MapProps & React.RefAttributes<MapRef>
  >;
  export const Marker: React.FC<MarkerProps>;
  export const Popup: React.FC<PopupProps>;
  export const NavigationControl: React.FC<NavigationControlProps>;
  export const Source: React.FC<SourceProps>;
  export const Layer: React.FC<LayerProps>;

  export default Map;
  export { MapRef, ViewStateChangeEvent };
}
