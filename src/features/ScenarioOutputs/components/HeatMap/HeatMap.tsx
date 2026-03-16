import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import type { HeatPoint } from "../../types";
import styles from "./HeatMap.module.css";

type HeatMapProps = {
  points: HeatPoint[];
  metricLabel: string;
  bounds: [number, number, number, number];
  className?: string;
  valueDomain?: {
    min: number;
    max: number;
  };
};

type TooltipState = {
  x: number;
  y: number;
  value: number;
  longitude: number;
  latitude: number;
};

const HEAT_SOURCE_ID = "surimi-heat-source";
const HEAT_LAYER_ID = "surimi-heat-layer";
const POINT_LAYER_ID = "surimi-point-layer";

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  transition: {
    duration: 0,
    delay: 0,
  },
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "\u00a9 OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      source: "osm",
      type: "raster",
    },
  ],
};

const toFeatureCollection = (
  points: HeatPoint[],
  valueDomain?: { min: number; max: number },
): FeatureCollection<Point> => {
  const fallbackMin = Math.min(...points.map((point) => point.value), 0);
  const fallbackMax = Math.max(...points.map((point) => point.value), 1);
  const minValue = valueDomain?.min ?? fallbackMin;
  const maxValue = valueDomain?.max ?? fallbackMax;
  const denominator = Math.max(maxValue - minValue, 0.0001);

  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
      properties: {
        value: point.value,
        weight: Math.max(Math.min((point.value - minValue) / denominator, 1), 0),
      },
    })),
  };
};

const HeatMap = ({
  points,
  metricLabel,
  bounds,
  className,
  valueDomain,
}: HeatMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const initialBoundsRef = useRef(bounds);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const sourceData = useMemo(() => toFeatureCollection(points, valueDomain), [points, valueDomain]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [
        (initialBoundsRef.current[0] + initialBoundsRef.current[2]) / 2,
        (initialBoundsRef.current[1] + initialBoundsRef.current[3]) / 2,
      ],
      zoom: 5.2,
      pitch: 26,
      bearing: -12,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource(HEAT_SOURCE_ID, {
        type: "geojson",
        data: sourceData,
      });

      map.addLayer({
        id: HEAT_LAYER_ID,
        type: "heatmap",
        source: HEAT_SOURCE_ID,
        maxzoom: 12,
        paint: {
          "heatmap-weight": ["coalesce", ["get", "weight"], 0],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.7,
            7,
            1.55,
            12,
            2.45,
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            9,
            8,
            26,
            12,
            44,
          ],
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.82,
            11,
            0.96,
            14,
            0.28,
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(56, 128, 255, 0)",
            0.2,
            "rgba(56, 128, 255, 0.58)",
            0.4,
            "rgba(48, 210, 242, 0.76)",
            0.6,
            "rgba(125, 242, 117, 0.86)",
            0.8,
            "rgba(249, 230, 79, 0.94)",
            1,
            "rgba(255, 111, 77, 1)",
          ],
        },
      });

      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: HEAT_SOURCE_ID,
        paint: {
          "circle-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "weight"], 0],
            0,
            "#3b88ff",
            0.2,
            "#30d2f2",
            0.45,
            "#7df275",
            0.7,
            "#f9e64f",
            1,
            "#ff6f4d",
          ],
          "circle-stroke-color": "#59d4ff",
          "circle-stroke-width": 0.6,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4,
            3,
            9,
            6,
            12,
            9,
          ],
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            0.28,
            9,
            0.75,
            12,
            0.9,
          ],
        },
      });

      map.fitBounds(
        [
          [initialBoundsRef.current[0], initialBoundsRef.current[1]],
          [initialBoundsRef.current[2], initialBoundsRef.current[3]],
        ],
        { padding: 56, duration: 0, maxZoom: 7.4 },
      );

      map.on("mouseenter", POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
        setTooltip(null);
      });

      map.on("mousemove", POINT_LAYER_ID, (event) => {
        const feature = event.features?.[0];
        if (!feature || !feature.properties) {
          setTooltip(null);
          return;
        }

        setTooltip({
          x: event.point.x,
          y: event.point.y,
          value: Number(feature.properties.value ?? 0),
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        });
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const source = map.getSource(HEAT_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    source.setData(sourceData);
  }, [sourceData]);

  return (
    <div className={[styles.mapWrap, className].filter(Boolean).join(" ")}>
      <div ref={mapContainerRef} className={styles.mapCanvas} />

      {points.length === 0 ? (
        <div className={styles.emptyState}>
          No map points available for this selection.
        </div>
      ) : null}

      {tooltip ? (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
          role="status"
          aria-live="polite"
        >
          <strong>{metricLabel}</strong>
          <span>{tooltip.value.toFixed(2)}</span>
          <small>
            {tooltip.longitude.toFixed(3)}, {tooltip.latitude.toFixed(3)}
          </small>
        </div>
      ) : null}
    </div>
  );
};

export default HeatMap;
