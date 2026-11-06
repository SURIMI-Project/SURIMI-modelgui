import Button from "../../../../components/ui/Button/Button";
import AnimatedWaterLayer from "./water/AnimatedWaterLayer";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as LibreMap } from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { FiPause, FiPlay } from "react-icons/fi";
import {
  aegeanStudyArea,
  caseMapPlaces,
  northwesternStudyArea,
  overviewBounds,
} from "../../../../../mock-data/caseMap";
import type { SimulationCaseId } from "../../../../data/simulationCases";
import styles from "./CaseStudyMap.module.css";

type Props = {
  selected: SimulationCaseId | null;
  available: ReadonlySet<SimulationCaseId>;
  reducedMotion: boolean;
  onSelect: (id: SimulationCaseId) => void;
};

const themeColour = (token: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim();
const rgbColour = (token: string): [number, number, number] => {
  const probe = document.createElement("span");
  probe.style.color = themeColour(token);
  document.body.append(probe);
  const values = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  if (!values || values.length < 3) throw new Error("Missing water palette");
  return [
    Number(values[0]) / 255,
    Number(values[1]) / 255,
    Number(values[2]) / 255,
  ];
};

const graticule: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [
    ...Array.from({ length: 12 }, (_, index) => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-20 + index * 6, 22],
          [-20 + index * 6, 58],
        ],
      },
    })),
    ...Array.from({ length: 10 }, (_, index) => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-25, 24 + index * 4],
          [50, 24 + index * 4],
        ],
      },
    })),
  ],
};

const moveCamera = (
  map: LibreMap,
  selected: SimulationCaseId | null,
  animate: boolean,
) => {
  const width = map.getContainer().clientWidth;
  const mobile = width < 760;
  const place = selected ? caseMapPlaces[selected] : null;
  const duration = animate ? 1700 : 0;
  if (!place?.location) {
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    map.fitBounds(overviewBounds, {
      duration,
      pitch: 0,
      bearing: 0,
      padding: mobile
        ? { top: 370, bottom: 150, left: 30, right: 30 }
        : {
            top: 130,
            bottom: 150,
            left: Math.min(width * 0.31, 430),
            right: 72,
          },
    });
    return;
  }
  if (selected === "aegean-sea" || selected === "northwestern-mediterranean") {
    // cameraForBounds includes retained camera padding; clear it before computing our own frame.
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    const area =
      selected === "aegean-sea" ? aegeanStudyArea : northwesternStudyArea;
    const camera = map.cameraForBounds(area.bounds, {
      bearing: place.bearing,
      padding: mobile
        ? {
            top: 150,
            bottom: selected === "aegean-sea" ? 370 : 440,
            left: 30,
            right: 30,
          }
        : selected === "aegean-sea"
          ? { top: 115, bottom: 135, left: 70, right: 70 }
          : {
              top: 120,
              bottom: 145,
              left: Math.min(width * 0.38, 490),
              right: 70,
            },
      maxZoom: place.zoom,
    });
    if (camera?.zoom !== undefined) {
      const target = {
        ...camera,
        zoom: camera.zoom - 0.08,
        pitch: mobile ? 0 : 30,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
      };
      if (animate) map.flyTo({ ...target, duration, essential: false });
      else map.jumpTo(target);
      return;
    }
  }
  const options = {
    center: place.location,
    zoom: mobile ? place.zoom - 0.6 : place.zoom,
    pitch: mobile ? 26 : 42,
    bearing: place.bearing,
    padding: mobile
      ? { top: 85, bottom: 360, left: 20, right: 20 }
      : { top: 110, bottom: 180, left: 480, right: 80 },
  };
  if (animate) map.flyTo({ ...options, duration, essential: false });
  else map.jumpTo(options);
};

// Official geometry is loaded on first selection and reused thereafter.
const studyAreas = [
  { caseId: "aegean-sea", prefix: "aegean", area: aegeanStudyArea },
  {
    caseId: "northwestern-mediterranean",
    prefix: "northwestern",
    area: northwesternStudyArea,
  },
] as const;

const updateStudyArea = (map: LibreMap, selected: SimulationCaseId | null) => {
  if (!map.getLayer("coasts")) return;
  // The educational illustration has no real-world location: show only decorative water.
  for (const id of ["land", "coasts", "grid"]) {
    map.setLayoutProperty(
      id,
      "visibility",
      selected === "anchovy-bay" ? "none" : "visible",
    );
  }
  for (const { caseId, prefix, area } of studyAreas) {
    const visible = selected === caseId;
    const source = `${prefix}-study-area`;
    if (visible && !map.getSource(source)) {
      const colour = themeColour(caseMapPlaces[caseId].colourToken);
      map.addSource(source, { type: "geojson", data: area.asset });
      map.addLayer(
        {
          id: `${prefix}-study-fill`,
          type: "fill",
          source,
          paint: { "fill-color": colour, "fill-opacity": 0.065 },
        },
        "land",
      );
      map.addLayer({
        id: `${prefix}-study-glow`,
        type: "line",
        source,
        paint: {
          "line-color": colour,
          "line-width": 7,
          "line-blur": 4,
          "line-opacity": 0.32,
        },
      });
      map.addLayer({
        id: `${prefix}-study-outline`,
        type: "line",
        source,
        paint: {
          "line-color": colour,
          "line-width": 1.8,
          "line-opacity": 0.95,
        },
      });
    }
    for (const suffix of ["fill", "glow", "outline"]) {
      const id = `${prefix}-study-${suffix}`;
      if (map.getLayer(id))
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  }
};

const GeographicMap = (props: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const buttons = useRef(new Map<SimulationCaseId, HTMLButtonElement>());
  const current = useRef(props);
  const water = useRef<AnimatedWaterLayer | null>(null);
  const waterMotion = useRef(false);
  const [waterReady, setWaterReady] = useState(false);
  const [waterPaused, setWaterPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const { selected, available, reducedMotion, onSelect } = props;
  useEffect(() => {
    waterMotion.current = !reducedMotion && !waterPaused;
    water.current?.setAnimationEnabled(waterMotion.current);
  }, [reducedMotion, waterPaused]);

  useEffect(() => {
    current.current = { selected, available, reducedMotion, onSelect };
    for (const [id, button] of buttons.current) {
      const dimmed = Boolean(selected && selected !== id);
      button.hidden = selected === "aegean-sea" || selected === "anchovy-bay";
      button.disabled =
        selected === "aegean-sea" ||
        !available.has(id) ||
        selected === "anchovy-bay";
      button.tabIndex = dimmed || button.disabled ? -1 : 0;
      button.dataset.dimmed = String(dimmed);
      button.dataset.selected = String(selected === id);
      button.setAttribute("aria-pressed", String(selected === id));
    }
    if (mapRef.current) {
      updateStudyArea(mapRef.current, selected);
      moveCamera(mapRef.current, selected, !reducedMotion);
    }
  }, [selected, available, reducedMotion, onSelect]);

  useEffect(() => {
    let disposed = false;
    const markers: maplibregl.Marker[] = [];
    let observer: ResizeObserver | undefined;
    // Give React's surrounding UI its first paint before initializing WebGL.
    const frame = requestAnimationFrame(() => {
      if (!container.current || disposed) return;
      try {
        const map = new maplibregl.Map({
          container: container.current,
          center: [13, 38],
          zoom: 4,
          minZoom: 2,
          maxZoom: 8,
          interactive: false,
          attributionControl: false,
          renderWorldCopies: false,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
          style: {
            version: 8,
            sources: {
              land: {
                type: "geojson",
                data: "/maps/mediterranean-context.geojson",
              },
              grid: { type: "geojson", data: graticule },
            },
            layers: [
              {
                id: "water",
                type: "background",
                paint: { "background-color": themeColour("--color-map-water") },
              },
              {
                id: "grid",
                type: "line",
                source: "grid",
                paint: {
                  "line-color": themeColour("--color-map-grid"),
                  "line-opacity": 0.065,
                  "line-width": 1,
                },
              },
              {
                id: "land",
                type: "fill",
                source: "land",
                paint: {
                  "fill-color": themeColour("--color-map-land"),
                  "fill-opacity": 1,
                },
              },
              {
                id: "coasts",
                type: "line",
                source: "land",
                paint: {
                  "line-color": themeColour("--color-map-coast"),
                  "line-opacity": 0.8,
                  "line-width": 1,
                },
              },
            ],
          },
        });
        mapRef.current = map;
        map.getCanvas().tabIndex = -1;
        map
          .getCanvas()
          .setAttribute("aria-label", "Mediterranean geographic context");
        const initialiseVisualLayers = () => {
          if (!disposed) {
            try {
              if (!map.getLayer("animated-water")) {
                const waterLayer = new AnimatedWaterLayer(
                  {
                    deep: rgbColour("--color-map-water-deep"),
                    shallow: rgbColour("--color-map-water-shallow"),
                    reflection: rgbColour("--color-map-water-reflection"),
                  },
                  (available) => {
                    if (!disposed) setWaterReady(available);
                  },
                );
                waterLayer.setAnimationEnabled(waterMotion.current);
                water.current = waterLayer;
                map.addLayer(waterLayer, "grid");
              }
            } catch {
              setWaterReady(false);
            }
            updateStudyArea(map, current.current.selected);
            setReady(true);
            setFailed(false);
          }
        };
        let initialStyleLoaded = false;
        map.on("load", () => {
          initialStyleLoaded = true;
          initialiseVisualLayers();
        });
        // MapLibre 5 rebuilds its style after a context loss and drops custom layers.
        map.on("style.load", () => {
          if (initialStyleLoaded) initialiseVisualLayers();
        });
        map.on("webglcontextlost", () => {
          water.current = null;
          if (!disposed) {
            setWaterReady(false);
            setFailed(true);
          }
        });
        map.on("error", () => {
          if (!disposed) setFailed(true);
        });

        for (const [id, place] of Object.entries(caseMapPlaces)) {
          if (!place.location) continue;
          const caseId = id as SimulationCaseId;
          const button = document.createElement("button");
          button.type = "button";
          button.className = styles.mapMarker;
          button.dataset.case = caseId;
          button.setAttribute("aria-label", `Preview ${place.title}`);
          button.setAttribute(
            "aria-pressed",
            String(current.current.selected === caseId),
          );
          const dimmed = Boolean(
            current.current.selected && current.current.selected !== caseId,
          );
          button.hidden =
            current.current.selected === "aegean-sea" ||
            current.current.selected === "anchovy-bay";
          button.disabled =
            current.current.selected === "aegean-sea" ||
            !current.current.available.has(caseId) ||
            current.current.selected === "anchovy-bay";
          button.tabIndex = dimmed || button.disabled ? -1 : 0;
          button.dataset.dimmed = String(dimmed);
          button.dataset.selected = String(current.current.selected === caseId);
          const label = document.createElement("span");
          label.className = styles.markerLabel;
          label.textContent = place.title;
          const dot = document.createElement("span");
          dot.className = styles.markerDot;
          dot.setAttribute("aria-hidden", "true");
          button.append(label, dot);
          button.addEventListener("click", () =>
            current.current.onSelect(caseId),
          );
          buttons.current.set(caseId, button);
          markers.push(
            new maplibregl.Marker({
              element: button,
              anchor: "bottom",
              offset: [0, 14],
            })
              .setLngLat(place.location)
              .addTo(map),
          );
        }
        moveCamera(map, current.current.selected, false);
        observer = new ResizeObserver(() => {
          map.resize();
          moveCamera(map, current.current.selected, false);
        });
        observer.observe(container.current);
      } catch {
        if (!disposed) setFailed(true);
      }
    });
    const markerButtons = buttons.current;
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      markers.forEach((marker) => marker.remove());
      markerButtons.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      water.current = null;
    };
  }, []);

  return (
    <>
      <div
        className={styles.mapLayer}
        data-water-state={
          waterReady
            ? reducedMotion
              ? "still"
              : waterPaused
                ? "paused"
                : "animated"
            : ready
              ? "fallback"
              : "loading"
        }
        aria-hidden={props.selected === "anchovy-bay" || undefined}
      >
        <div ref={container} className={styles.mapCanvas} />
      </div>
      {props.selected !== "anchovy-bay" && (failed || !ready) ? (
        <p className={styles.mapStatus} role="status">
          {failed
            ? "Map preview unavailable. Choose a case below to continue."
            : "Preparing the map…"}
        </p>
      ) : null}
      {ready && waterReady && !reducedMotion ? (
        <Button
          variant="primary-outlined"
          size="sm"
          className={styles.waterPlayback}
          aria-label={
            waterPaused ? "Resume water animation" : "Pause water animation"
          }
          onPress={() => setWaterPaused((value) => !value)}
        >
          {waterPaused ? <FiPlay /> : <FiPause />}
          {waterPaused ? "Resume water" : "Pause water"}
        </Button>
      ) : null}
    </>
  );
};
export default GeographicMap;
