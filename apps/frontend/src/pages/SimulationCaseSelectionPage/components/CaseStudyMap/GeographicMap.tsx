import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import MarineCaseIdentity from "../../../../components/presentational/CaseStudyCard/MarineCaseIdentity";
import AnimatedWaterLayer from "./water/AnimatedWaterLayer";
import loadLandMask, { type LandMask } from "./water/loadLandMask";
import { releaseMapImage, type MapImage } from "./water/loadMapImage";
import { terrainFlatGround } from "./water/terrainAssets";
import loadTerrainRelief from "./water/loadTerrainRelief";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as LibreMap } from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  aegeanStudyArea,
  caseMapPlaces,
  northwesternStudyArea,
  overviewBounds,
} from "../../../../../mock-data/caseMap";
import type { SimulationCaseId } from "../../../../data/simulationCases";
import styles from "./CaseStudyMap.module.css";

type Props = {
  /** Temporary developer placement controls; disabled by default. */
  enablePlacementTools?: boolean;
  backgroundOnly?: boolean;
  selected: SimulationCaseId | null;
  available: ReadonlySet<SimulationCaseId>;
  reducedMotion: boolean;
  onSelect: (id: SimulationCaseId) => void;
};

const themeColour = (
  token: string,
  scope: HTMLElement = document.documentElement,
) => getComputedStyle(scope).getPropertyValue(token).trim();
const rgbColour = (
  token: string,
  scope: HTMLElement,
): [number, number, number] => {
  const probe = document.createElement("span");
  probe.style.color = themeColour(token, scope);
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

const sceneTransitionDuration = 1700;

const waterColours = (scope: HTMLElement) => ({
  deep: rgbColour("--color-map-water-deep", scope),
  shallow: rgbColour("--color-map-water-shallow", scope),
  reflection: rgbColour("--color-map-water-reflection", scope),
});

const updateMapAppearance = (
  map: LibreMap,
  water: AnimatedWaterLayer | null,
  reducedMotion: boolean,
) => {
  if (!map.getLayer("water")) return;
  const scope = map.getContainer();
  const duration = reducedMotion ? 0 : sceneTransitionDuration;
  map.setPaintProperty("water", "background-color-transition", {
    duration,
    delay: 0,
  });
  map.setPaintProperty(
    "water",
    "background-color",
    themeColour("--color-map-water", scope),
  );
  water?.setColours(waterColours(scope), duration);
  const fictional = scope.closest("[data-selected]")?.getAttribute("data-selected") === "anchovy-bay";
  water?.setScenePreset(fictional);
  // The opaque Anchovy background needs no hidden water repaint loop.
  water?.setAnimationEnabled(!fictional && !reducedMotion);
  // Keep geographic colour variation consistent while entering either real sea.
  water?.setRegionalPalette(!fictional);
};

const updateTerrainVisibility = (water: AnimatedWaterLayer | null, selected: SimulationCaseId | null, enabled: boolean) => {
  water?.setTerrainEnabled(enabled && selected !== "anchovy-bay");
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
  const duration = animate ? sceneTransitionDuration : 0;
  if (selected === "anchovy-bay") return;
  if (!place?.location) {
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    if (!mobile) {
      // Match the approved 1920 × 935 overview, scaling to fit smaller viewports.
      const scale = Math.min(width / 1920, map.getContainer().clientHeight / 935);
      const camera = { center: [16.248039215126823, 40.361647344601096] as [number, number], zoom: 4.503757540851962 + Math.log2(scale), pitch: 0, bearing: 0 };
      if (animate) map.flyTo({ ...camera, duration });
      else map.jumpTo(camera);
      return;
    }
    map.fitBounds(overviewBounds, {
      duration,
      pitch: 0,
      bearing: 0,
      padding: mobile
        ? { top: 370, bottom: 150, left: 30, right: 30 }
        : {
            top: 130,
            bottom: 150,
            left: Math.min(width * 0.15, 160),
            right: 110,
          },
    });
    return;
  }
  if (selected === "aegean-sea" || selected === "northwestern-mediterranean") {
    if (!mobile) {
      // Approved desktop framing at 1920 × 935, scaled for smaller viewports.
      const scale = Math.min(width / 1920, map.getContainer().clientHeight / 935);
      const saved = selected === "aegean-sea"
        ? { center: [20.721875773772723, 37.028791725533594] as [number, number], zoom: 5.362493267783633, bearing: 12, pitch: 30 }
        : { center: [-2.9279495182600783, 38.910470415776274] as [number, number], zoom: 5.218940020276727, bearing: -13.691086194773106, pitch: 29.463869545877365 };
      const target = { ...saved, zoom: saved.zoom + Math.log2(scale), padding: { top: 0, bottom: 0, left: 0, right: 0 } };
      map.setPadding(target.padding);
      if (animate) map.flyTo({ ...target, duration, essential: false });
      else map.jumpTo(target);
      return;
    }
    // cameraForBounds includes retained camera padding; clear it before computing our own frame.
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    const area =
      selected === "aegean-sea" ? aegeanStudyArea : northwesternStudyArea;
    const camera = map.cameraForBounds(area.bounds, {
      bearing: place.bearing,
      padding: mobile
        ? { top: 185, bottom: 290, left: 30, right: 30 }
        : { top: 165, bottom: 145, left: Math.min(width * 0.4, 640), right: Math.min(width * 0.27, 390) },
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

// Official geometry is loaded when first shown (including the overview) and reused.
const studyAreas = [
  { caseId: "aegean-sea", prefix: "aegean", area: aegeanStudyArea },
  {
    caseId: "northwestern-mediterranean",
    prefix: "northwestern",
    area: northwesternStudyArea,
  },
] as const;

const studyAreaAppearance = (caseId: SimulationCaseId, selected: SimulationCaseId | null) => {
  const focused = selected === caseId;
  return {
    fillOpacity: focused ? 0.10 : 0.18,
    glowOpacity: focused ? 0.28 : 0.42,
    glowWidth: focused ? 4.6 : 4.5,
    glowBlur: focused ? 1.0 : 1.5,
    outlineWidth: focused ? 2.25 : caseId === "northwestern-mediterranean" ? 1.8 : 1.6,
  };
};

const updateStudyArea = (map: LibreMap, selected: SimulationCaseId | null) => {
  if (!map.getLayer("coasts")) return;
  // Fictional geography replaces the real basemap, within the same MapLibre instance.
  for (const id of ["land", "coasts", "grid"]) {
    map.setLayoutProperty(
      id,
      "visibility",
      selected === "anchovy-bay" ? "none" : "visible",
    );
  }
  for (const { caseId, prefix, area } of studyAreas) {
    const visible = selected === null || selected === caseId;
    const source = `${prefix}-study-area`;
    const appearance = studyAreaAppearance(caseId, selected);
    if (visible && !map.getSource(source)) {
      const northwestern = caseId === "northwestern-mediterranean";
      const colour = northwestern
        ? themeColour("--color-map-study-northwestern")
        : themeColour("--color-map-study-boundary");
      map.addSource(source, { type: "geojson", data: area.asset });
      map.addLayer(
        {
          id: `${prefix}-study-fill`,
          type: "fill",
          source,
          paint: { "fill-color": themeColour("--color-map-study-fill"), "fill-opacity": appearance.fillOpacity },
        },
        "coasts",
      );
      // A decorative elevated surface provides depth without scaling the source geometry.
      map.addLayer({
        id: `${prefix}-study-lift`,
        type: "fill-extrusion",
        source,
        paint: {
          "fill-extrusion-color": themeColour("--color-map-study-lift"),
          "fill-extrusion-height": 0,
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0,
          "fill-extrusion-height-transition": { duration: 220 },
          "fill-extrusion-opacity-transition": { duration: 220 },
          "fill-extrusion-vertical-gradient": true,
        },
      });
      map.addLayer({
        id: `${prefix}-study-glow`,
        type: "line",
        source,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": colour,
          "line-width": appearance.glowWidth,
          "line-blur": appearance.glowBlur,
          "line-opacity": appearance.glowOpacity,
        },
      });
      map.addLayer({
        id: `${prefix}-study-outline`,
        type: "line",
        source,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": colour,
          "line-width": appearance.outlineWidth,
          "line-opacity": 1,
        },
      });
    }
    if (visible) {
      for (const [suffix, property, value] of [
        ["fill", "fill-opacity", appearance.fillOpacity],
        ["glow", "line-width", appearance.glowWidth],
        ["glow", "line-blur", appearance.glowBlur],
        ["glow", "line-opacity", appearance.glowOpacity],
        ["outline", "line-width", appearance.outlineWidth],
      ] as const) {
        if (map.getLayer(`${prefix}-study-${suffix}`)) map.setPaintProperty(`${prefix}-study-${suffix}`, property, value);
      }
    }
    for (const suffix of ["fill", "lift", "glow", "outline"]) {
      const id = `${prefix}-study-${suffix}`;
      if (map.getLayer(id))
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  }
};

const GeographicMap = (props: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const curtain = useRef<HTMLDivElement>(null);
  const lastScene = useRef<SimulationCaseId | null>(props.selected);
  const switchingScene = useRef(false);
  const mapRef = useRef<LibreMap | null>(null);
  const resetHover = useRef<() => void>(() => {});
  const markerRoots = useRef(new Map<SimulationCaseId, Root>());
  const buttons = useRef(new Map<SimulationCaseId, HTMLDivElement>());
  const current = useRef(props);
  const water = useRef<AnimatedWaterLayer | null>(null);
  const terrainEnabled = useRef(false);
  const terrainFailed = useRef(false);
  const [terrainUnavailable, setTerrainUnavailable] = useState(false);
  const [terrainLoading, setTerrainLoading] = useState(true);
  const [waterReady, setWaterReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const { selected, available, reducedMotion, onSelect, backgroundOnly } = props;
  useEffect(() => {
    current.current = { ...current.current, selected, available, reducedMotion, onSelect, backgroundOnly };
    for (const [id, button] of buttons.current) {
      const dimmed = Boolean(selected && selected !== id);
      button.hidden = Boolean(backgroundOnly) || selected !== null;
      button.tabIndex = -1;
      button.dataset.dimmed = String(dimmed);
      button.dataset.selected = String(selected === id);
      button.setAttribute("aria-pressed", String(selected === id));
    }
    const map = mapRef.current;
    if (!map) return;
    const selectionChanged = selected !== lastScene.current;
    if (selectionChanged) resetHover.current();
    const fictional = selected === "anchovy-bay";
    const crossesScene = fictional !== (lastScene.current === "anchovy-bay");
    lastScene.current = selected;
    const applyScene = () => {
      map.stop();
      map.setMaxBounds(null);
      map.setMinZoom(2);
      map.setMaxZoom(8);
      updateStudyArea(map, selected);
      updateTerrainVisibility(water.current, selected, terrainEnabled.current && !terrainFailed.current);
      updateMapAppearance(map, water.current, reducedMotion);
      map.getCanvas().setAttribute("aria-label", fictional ? "Fictional Anchovy Bay educational map" : "Mediterranean geographic context");
      if (selectionChanged) moveCamera(map, selected, !crossesScene && !reducedMotion);
    };
    if (!crossesScene || reducedMotion || !curtain.current) {
      applyScene();
      return;
    }
    switchingScene.current = true;
    const overlay = curtain.current;
    const fadeOut = overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, fill: "forwards" });
    let fadeIn: Animation | undefined;
    const timer = window.setTimeout(() => {
      applyScene();
      // Hold the curtain until locally loaded geometry is ready, with a bounded fallback.
      map.once("idle", reveal);
      fallback = window.setTimeout(reveal, 1800);
    }, 180);
    let fallback: number | undefined;
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      window.clearTimeout(fallback);
      map.off("idle", reveal);
      fadeIn = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: "forwards" });
      switchingScene.current = false;
    };
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
      map.off("idle", reveal);
      fadeOut.cancel();
      fadeIn?.cancel();
      switchingScene.current = false;
    };
  }, [selected, available, reducedMotion, onSelect, backgroundOnly]);

  useEffect(() => {
    for (const [caseId, root] of markerRoots.current) {
      root.render(createElement(MarineCaseIdentity, {
        caseId,
        disabled: !available.has(caseId),
        onSelect: () => current.current.onSelect(caseId),
      }));
    }
  }, [available, onSelect, ready]);

  useEffect(() => { current.current = props; }, [props]);

  useEffect(() => {
    let disposed = false;
    const markers: maplibregl.Marker[] = [];
    const cardRoots: Root[] = [];
    let observer: ResizeObserver | undefined;
    let resizeFrame = 0;
    let reframeTimer: number | undefined;
    let cardObserver: ResizeObserver | undefined;
    let cleanupHover: (() => void) | undefined;
    let releaseTerrainImage: (() => void) | undefined;
    let releaseMaskImage: (() => void) | undefined;
    let detailTimer: number | undefined;
    // Give React's surrounding UI its first paint before initializing WebGL.
    const frame = requestAnimationFrame(() => {
      if (!container.current || disposed) return;
      try {
        const map = new maplibregl.Map({
          container: container.current,
          trackResize: false,
          center: [13, 38],
          zoom: 4,
          minZoom: 2,
          maxZoom: 8,
          interactive: true,
          dragPan: Boolean(import.meta.env.DEV && current.current.enablePlacementTools),
          scrollZoom: Boolean(import.meta.env.DEV && current.current.enablePlacementTools),
          boxZoom: false,
          doubleClickZoom: Boolean(import.meta.env.DEV && current.current.enablePlacementTools),
          keyboard: Boolean(import.meta.env.DEV && current.current.enablePlacementTools),
          touchZoomRotate: Boolean(import.meta.env.DEV && current.current.enablePlacementTools),
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
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
                paint: {
                  "background-color": themeColour(
                    "--color-map-water",
                    container.current,
                  ),
                },
              },
              {
                id: "grid",
                type: "line",
                source: "grid",
                paint: {
                  "line-color": themeColour("--color-map-grid"),
                  "line-opacity": 0.025,
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
                  "line-opacity": 0.6,
                  "line-width": 0.8,
                },
              },
            ],
          },
        });
        mapRef.current = map;
        map.getCanvas().tabIndex = current.current.enablePlacementTools ? 0 : -1;
        map
          .getCanvas()
          .setAttribute("aria-label", "Mediterranean geographic context");
        const decodedTerrainImages = new Set<MapImage>();
        let maskImage: MapImage | undefined;
        let detailedImage: MapImage | undefined;
        let detailStarted = false;
        releaseTerrainImage = () => {
          decodedTerrainImages.forEach(releaseMapImage);
          decodedTerrainImages.clear();
        };
        releaseMaskImage = () => {
          if (maskImage) releaseMapImage(maskImage);
          maskImage = undefined;
        };
        const keepTerrainImage = (image: MapImage) => {
          if (disposed) releaseMapImage(image);
          else decodedTerrainImages.add(image);
          return image;
        };
        // Both small assets load in parallel; neither depends on the country GeoJSON.
        const maskPromise: Promise<LandMask | undefined> = loadLandMask()
          .then((mask) => {
            maskImage = mask.canvas;
            if (disposed) releaseMaskImage?.();
            return mask;
          })
          .catch(() => {
            if (!disposed) {
              setTerrainUnavailable(true);
              setTerrainLoading(false);
            }
            return undefined;
          });
        const reliefPromise = loadTerrainRelief(map, "preview")
          .then(keepTerrainImage)
          .catch(() => {
            if (!disposed) {
              terrainFailed.current = true;
              setTerrainLoading(false);
              setTerrainUnavailable(true);
              updateTerrainVisibility(water.current, current.current.selected, false);
            }
            return undefined;
          });
        const startDetailedTerrain = () => {
          if (detailStarted || disposed) return;
          detailStarted = true;
          // Let the preview reach the screen before requesting the larger texture.
          detailTimer = window.setTimeout(() => {
            if (disposed) return;
            void loadTerrainRelief(map, "detail")
              .then((image) => {
                keepTerrainImage(image);
                if (disposed) return;
                detailedImage = image;
                water.current?.setTerrainImage(image);
                updateTerrainVisibility(water.current, current.current.selected, terrainEnabled.current);
              })
              .catch(() => {
                // A failed detail download leaves the complete preview and animation usable.
              });
          }, 120);
        };
        let visualGeneration = 0;
        const initialiseVisualLayers = async () => {
          const generation = ++visualGeneration;
          const landMask = await maskPromise;
          if (disposed || generation !== visualGeneration) return;
          try {
            if (!map.getLayer("animated-water")) {
              const waterLayer = new AnimatedWaterLayer(
                waterColours(map.getContainer()),
                (available) => {
                  if (disposed) return;
                  setWaterReady(available);
                  terrainEnabled.current = available && Boolean(landMask);
                  updateTerrainVisibility(water.current, current.current.selected, terrainEnabled.current && !terrainFailed.current);
                  if (!available) {
                    setTerrainUnavailable(true);
                    setTerrainLoading(false);
                  }
                },
                landMask,
                {
                  flatGround: terrainFlatGround,
                  shadow: rgbColour("--color-map-terrain-shadow", map.getContainer()),
                  lowland: rgbColour("--color-map-terrain-lowland", map.getContainer()),
                  ridge: rgbColour("--color-map-terrain-ridge", map.getContainer()),
                },
                (available) => {
                  if (disposed) return;
                  setTerrainLoading(false);
                  setTerrainUnavailable(!available);
                  terrainFailed.current = !available;
                  if (available) startDetailedTerrain();
                  if (!available) {
                    updateTerrainVisibility(water.current, current.current.selected, false);
                  }
                },
              );
              water.current = waterLayer;
              map.addLayer(waterLayer, landMask ? "coasts" : "grid");
              if (landMask) map.moveLayer("grid", "coasts");
            }
          } catch {
            terrainEnabled.current = false;
            updateTerrainVisibility(water.current, current.current.selected, false);
            setWaterReady(false);
            setTerrainLoading(false);
            setTerrainUnavailable(true);
          }
          if (landMask) {
            void reliefPromise.then((image) => {
              if (disposed || generation !== visualGeneration || !image) return;
              water.current?.setTerrainImage(detailedImage ?? image);
              updateTerrainVisibility(water.current, current.current.selected, terrainEnabled.current);
              if (terrainEnabled.current) setTerrainUnavailable(false);
            });
          }
          updateStudyArea(map, current.current.selected);
          updateTerrainVisibility(water.current, current.current.selected, terrainEnabled.current && !terrainFailed.current);
          updateMapAppearance(map, water.current, current.current.reducedMotion);
          setReady(true);
          setFailed(false);
        };
        // Start once the style exists; large outline sources may continue loading afterwards.
        map.on("style.load", () => { void initialiseVisualLayers(); });
        map.on("webglcontextlost", () => {
          ++visualGeneration;
          water.current = null;
          terrainEnabled.current = false;
          if (!disposed) setTerrainLoading(true);
          if (!disposed) {
            setWaterReady(false);
            setFailed(true);
          }
        });
        map.on("error", () => {
          if (disposed) return;
          setFailed(true);
        });

        // Sea names are geographic context, separate from interactive study cards.
        const seaLabels: { name: string; coordinates: [number, number]; caseId?: SimulationCaseId; broad?: boolean }[] = [
          { name: "Northwestern\nMediterranean\nSea", coordinates: [4.7, 39.3], caseId: "northwestern-mediterranean" },
          { name: "Aegean\nSea", coordinates: [25.6, 37.3], caseId: "aegean-sea" },
          { name: "Ionian\nSea", coordinates: [18.4, 36.6] },
          { name: "Mediterranean Sea", coordinates: [16.5, 33.5], broad: true },
        ];
        for (const { name, coordinates, caseId, broad } of seaLabels) {
          const label = document.createElement("span");
          label.className = styles.seaLabel;
          label.textContent = name;
          label.dataset.sea = caseId ?? "context";
          if (broad) label.dataset.broad = "true";
          label.setAttribute("aria-hidden", "true");
          markers.push(new maplibregl.Marker({ element: label, anchor: "center" })
            .setLngLat(coordinates).addTo(map));
        }

        // Temporary dev-only placement controls. Positions are viewport fractions.
        const cardPositions = new Map<SimulationCaseId, { x: number; y: number }>();
        for (const [id, place] of Object.entries(caseMapPlaces)) {
          if (!place.location) continue;
          const caseId = id as SimulationCaseId;
          const button = document.createElement("div");
          button.className = styles.mapMarker;
          button.dataset.case = caseId;
          button.setAttribute("aria-label", `Preview ${place.title}`);
          button.setAttribute(
            "aria-pressed",
            String(current.current.selected === caseId),
          );

          button.hidden = Boolean(current.current.backgroundOnly) || current.current.selected !== null;
          button.tabIndex = -1;
          button.dataset.dimmed = String(Boolean(current.current.selected && current.current.selected !== caseId));
          button.dataset.selected = String(current.current.selected === caseId);
          const label = document.createElement("span");
          label.className = styles.markerLabel;
          const content = document.createElement("div");
          if (import.meta.env.DEV && current.current.enablePlacementTools) {
            const handle = document.createElement("button");
            handle.type = "button";
            handle.className = styles.cardDragHandle;
            handle.textContent = "⠿ Drag to position";
            handle.setAttribute("aria-label", `Move ${place.title} card. Drag or use arrow keys.`);
            let drag: { pointer: number; x: number; y: number; left: number; top: number } | null = null;
            const placeCard = (left: number, top: number) => {
              const viewport = map.getContainer();
              const x = Math.max(8, Math.min(left, viewport.clientWidth - label.offsetWidth - 8));
              const y = Math.max(8, Math.min(top, viewport.clientHeight - label.offsetHeight - 8));
              cardPositions.set(caseId, { x: x / viewport.clientWidth, y: y / viewport.clientHeight });
              updateCardSpace();
              updateConnectors();
            };
            handle.addEventListener("mousedown", event => event.stopPropagation());
            handle.addEventListener("dblclick", event => event.stopPropagation());
            handle.addEventListener("pointerdown", event => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              const box = label.getBoundingClientRect();
              const viewport = map.getContainer().getBoundingClientRect();
              drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: box.left - viewport.left, top: box.top - viewport.top };
              handle.setPointerCapture(event.pointerId);
            });
            handle.addEventListener("pointermove", event => {
              if (!drag || drag.pointer !== event.pointerId) return;
              event.preventDefault();
              event.stopPropagation();
              placeCard(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
            });
            const finishDrag = (event: PointerEvent) => {
              if (!drag || drag.pointer !== event.pointerId) return;
              event.stopPropagation();
              drag = null;
              logLayout();
            };
            handle.addEventListener("pointerup", finishDrag);
            handle.addEventListener("pointercancel", finishDrag);
            handle.addEventListener("lostpointercapture", () => { drag = null; });
            handle.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); });
            handle.addEventListener("keydown", event => {
              if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
              event.preventDefault(); event.stopPropagation();
              const box = label.getBoundingClientRect();
              const viewport = map.getContainer().getBoundingClientRect();
              const step = event.shiftKey ? 10 : 2;
              placeCard(box.left - viewport.left + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0), box.top - viewport.top + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0));
              logLayout();
            });
            label.append(handle);
          }
          label.append(content);
          const cardRoot = createRoot(content);
          cardRoots.push(cardRoot);
          markerRoots.current.set(caseId, cardRoot);
          cardRoot.render(createElement(MarineCaseIdentity, {
            caseId,
            disabled: !current.current.available.has(caseId),
            onSelect: () => current.current.onSelect(caseId),
          }));
          const dot = document.createElement("span");
          dot.className = styles.markerDot;
          dot.setAttribute("aria-hidden", "true");
          const connector = document.createElement("span");
          connector.className = styles.mapConnector;
          connector.setAttribute("aria-hidden", "true");
          button.append(connector, label, dot);

          buttons.current.set(caseId, button);
          markers.push(
            new maplibregl.Marker({
              element: button,
              anchor: "bottom",
              offset: [0, 0],
            })
              .setLngLat(place.location)
              .addTo(map),
          );
        }
        const updateConnectors = () => {
          for (const element of buttons.current.values()) {
            const label = element.querySelector<HTMLElement>(`.${styles.markerLabel}`);
            const dot = element.querySelector<HTMLElement>(`.${styles.markerDot}`);
            const connector = element.querySelector<HTMLElement>(`.${styles.mapConnector}`);
            if (!label || !dot || !connector) continue;
            const card = label.getBoundingClientRect();
            const pin = dot.getBoundingClientRect();
            const origin = element.getBoundingClientRect();
            const x = pin.left + pin.width / 2;
            const y = pin.top + pin.height / 2;
            const targetX = Math.max(card.left, Math.min(x, card.right));
            const targetY = Math.max(card.top, Math.min(y, card.bottom));
            const dx = targetX - x;
            const dy = targetY - y;
            connector.style.left = `${x - origin.left}px`;
            connector.style.top = `${y - origin.top}px`;
            connector.style.height = `${Math.hypot(dx, dy)}px`;
            connector.style.transform = `rotate(${Math.atan2(-dx, dy)}rad)`;
            dot.style.visibility = Math.hypot(dx, dy) < 1 ? "hidden" : "visible";
          }
        };
        cardObserver = new ResizeObserver(updateConnectors);
        for (const element of buttons.current.values()) {
          const label = element.querySelector(`.${styles.markerLabel}`);
          if (label) cardObserver.observe(label);
        }
        const logCamera = () => {
          if (!import.meta.env.DEV || !current.current.enablePlacementTools) return;
          const center = map.getCenter();
          console.info("SURIMI_MAP_CAMERA " + JSON.stringify({
            scene: current.current.selected ?? "overview",
            center: [center.lng, center.lat], zoom: map.getZoom(),
            bearing: map.getBearing(), pitch: map.getPitch(), padding: map.getPadding(),
            viewport: { width: map.getContainer().clientWidth, height: map.getContainer().clientHeight },
            bounds: map.getBounds().toArray(),
          }));
        };
        const logLayout = () => {
          if (!import.meta.env.DEV || !current.current.enablePlacementTools || current.current.selected) return;
          const viewport = map.getContainer();
          const bounds = viewport.getBoundingClientRect();
          const center = map.getCenter();
          const cards = Object.fromEntries([...buttons.current].map(([id, element]) => {
            const label = element.querySelector(`.${styles.markerLabel}`)!;
            // Record the card itself, excluding the temporary drag handle.
            const card = (label.lastElementChild ?? label).getBoundingClientRect();
            return [id, { left: card.left - bounds.left, top: card.top - bounds.top, width: card.width, height: card.height, x: (card.left - bounds.left) / viewport.clientWidth, y: (card.top - bounds.top) / viewport.clientHeight }];
          }));
          console.info("SURIMI_LAYOUT " + JSON.stringify({ camera: { center: [center.lng, center.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), padding: map.getPadding() }, viewport: { width: viewport.clientWidth, height: viewport.clientHeight }, cards }));
        };
        const hoveredStudy = (point: maplibregl.Point) => {
          const layers = studyAreas.flatMap(({ prefix }) => [`${prefix}-study-fill`]).filter(id => map.getLayer(id));
          if (!layers.length) return null;
          const feature = map.queryRenderedFeatures([[point.x - 3, point.y - 3], [point.x + 3, point.y + 3]], { layers })[0];
          return studyAreas.find(({ prefix }) => feature?.layer.id.startsWith(`${prefix}-study-`))?.caseId ?? null;
        };
        // Update hover directly: no React rerenders, delayed leave timers or geometry changes.
        const page = map.getContainer().closest("main");
        let activeHover: SimulationCaseId | null = null;
        let hoverFrame = 0;
        const applyHover = (id: SimulationCaseId | null) => {
          if (id === activeHover) return;
          activeHover = id;
          if (page) {
            if (id) page.dataset.mapHovered = id;
            else delete page.dataset.mapHovered;
          }
          for (const [caseId, element] of buttons.current) element.dataset.hoverActive = String(id === caseId);
          const duration = current.current.reducedMotion ? 0 : 100;
          for (const { caseId, prefix } of studyAreas) {
            const active = id === caseId;
            const dimmed = id !== null && !active;
            const appearance = studyAreaAppearance(caseId, current.current.selected);
            for (const [suffix, property, value] of [
              ["fill", "fill-opacity", active ? 0.28 : dimmed ? 0.04 : appearance.fillOpacity],
              ["glow", "line-opacity", active ? 0.60 : dimmed ? 0.08 : appearance.glowOpacity],
              ["outline", "line-opacity", dimmed ? 0.3 : 1],
              ["outline", "line-width", active ? appearance.outlineWidth + 0.5 : appearance.outlineWidth],
            ] as const) {
              const layer = `${prefix}-study-${suffix}`;
              if (!map.getLayer(layer)) continue;
              map.setPaintProperty(layer, `${property}-transition`, { duration });
              map.setPaintProperty(layer, property, value);
            }
          }
        };
        const setHover = (id: SimulationCaseId | null) => {
          cancelAnimationFrame(hoverFrame);
          // Coalesce canvas/card pointer handoff within one frame, without a leave delay.
          if (id) applyHover(id);
          else hoverFrame = requestAnimationFrame(() => applyHover(null));
        };
        resetHover.current = () => { cancelAnimationFrame(hoverFrame); applyHover(null); };
        const cardAt = (target: EventTarget | null) => {
          if (!(target instanceof Element)) return null;
          const card = target.closest<HTMLElement>(`[data-case-study], .${styles.bayCard}`);
          if (!card) return null;
          return (card.dataset.caseStudy ?? "anchovy-bay") as SimulationCaseId;
        };
        const enterCard = (event: Event) => {
          if (current.current.selected || current.current.backgroundOnly) return;
          const id = cardAt(event.target);
          if (id) setHover(id);
        };
        const leaveCard = (event: Event) => {
          if (!cardAt(event.target)) return;
          const next = cardAt((event as MouseEvent | FocusEvent).relatedTarget);
          setHover(next);
        };
        page?.addEventListener("pointerover", enterCard);
        page?.addEventListener("pointerout", leaveCard);
        page?.addEventListener("focusin", enterCard);
        page?.addEventListener("focusout", leaveCard);
        map.on("mousemove", event => {
          if (current.current.selected || current.current.backgroundOnly || event.originalEvent.target !== map.getCanvas()) return;
          const id = hoveredStudy(event.point);
          setHover(id);
          map.getCanvas().style.cursor = id ? "pointer" : "";
        });
        const leavePage = () => setHover(null);
        page?.addEventListener("pointerleave", leavePage);
        cleanupHover = () => {
          resetHover.current();
          page?.removeEventListener("pointerover", enterCard);
          page?.removeEventListener("pointerout", leaveCard);
          page?.removeEventListener("focusin", enterCard);
          page?.removeEventListener("focusout", leaveCard);
          page?.removeEventListener("pointerleave", leavePage);
          resetHover.current = () => {};
        };
        map.on("click", event => {
          if (current.current.selected || current.current.backgroundOnly || event.originalEvent.target !== map.getCanvas()) return;
          const id = hoveredStudy(event.point);
          if (id && current.current.available.has(id)) current.current.onSelect(id);
        });
        map.on("moveend", logCamera);
        map.on("moveend", logLayout);
        const updateCardSpace = () => {
          for (const [id, element] of buttons.current) {
            const location = caseMapPlaces[id].location;
            if (!location) continue;
            const point = map.project(location);
            const viewport = map.getContainer();
            const cardWidth = viewport.clientWidth > 1200 ? 304 : 272;
            const saved = id === "aegean-sea"
              ? { x: 0.706, y: 0.227 }
              : { x: 0.318, y: 0.174 };
            const custom = cardPositions.get(id) ?? saved;
            const left = Math.min(viewport.clientWidth - cardWidth - 8, Math.max(8, custom.x * viewport.clientWidth));
            const top = Math.max(8, Math.min(custom.y * viewport.clientHeight, viewport.clientHeight - 160));
            element.style.setProperty("--card-left", `${left - point.x}px`);
            element.style.setProperty("--card-top", `${top - point.y}px`);
            element.style.setProperty("--card-room", `${Math.max(200, viewport.clientHeight - 240)}px`);
          }
        };
        map.on("move", updateCardSpace);
        map.on("move", updateConnectors);
        moveCamera(map, current.current.selected, false);
        updateCardSpace();
        updateConnectors();
        let lastWidth = container.current.clientWidth;
        let lastHeight = container.current.clientHeight;
        observer = new ResizeObserver(() => {
          const viewport = map.getContainer();
          const width = viewport.clientWidth;
          const height = viewport.clientHeight;
          if (!width || !height || (width === lastWidth && height === lastHeight)) return;
          lastWidth = width;
          lastHeight = height;
          if (!resizeFrame) resizeFrame = requestAnimationFrame(() => {
            resizeFrame = 0;
            if (disposed) return;
            map.resize();
            updateCardSpace();
            updateConnectors();
          });
          window.clearTimeout(reframeTimer);
          reframeTimer = window.setTimeout(() => {
            if (disposed) return;
            if (!current.current.enablePlacementTools && !switchingScene.current) moveCamera(map, current.current.selected, false);
            updateCardSpace();
            updateConnectors();
          }, 160);
        });
        observer.observe(container.current);
      } catch {
        if (!disposed) setFailed(true);
      }
    });
    const markerButtons = buttons.current;
    const roots = markerRoots.current;
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      window.clearTimeout(reframeTimer);
      window.clearTimeout(detailTimer);
      cleanupHover?.();
      observer?.disconnect();
      cardObserver?.disconnect();
      cardRoots.forEach(root => root.unmount());
      roots.clear();
      markers.forEach((marker) => marker.remove());
      markerButtons.clear();
      mapRef.current?.remove();
      releaseTerrainImage?.();
      releaseMaskImage?.();
      mapRef.current = null;
      water.current = null;
      terrainEnabled.current = false;
      terrainFailed.current = false;
    };
  }, []);

  const scenePending = selected !== "anchovy-bay" && !failed && (!ready || terrainLoading);
  return (
    <>
      <div
        className={styles.mapLayer}
        data-scene-pending={scenePending}
        inert={scenePending}
        aria-busy={scenePending || undefined}
        data-map-ready={ready}
        data-terrain-state={terrainLoading ? "loading" : terrainUnavailable ? "fallback" : "ready"}
        aria-hidden={scenePending || backgroundOnly || selected === "anchovy-bay" || undefined}
        data-water-state={
          waterReady
            ? selected === "anchovy-bay" ? "still" : "animated"
            : ready
              ? "fallback"
              : "loading"
        }
      >
        <div ref={container} className={styles.mapCanvas} />
      </div>
      <div ref={curtain} className={styles.sceneCurtain} aria-hidden="true" />
      {terrainLoading && !failed && !backgroundOnly && selected !== "anchovy-bay" ? (
        <p className={styles.terrainLoading} role="status">Loading terrain…</p>
      ) : null}
      {terrainUnavailable && !failed && !backgroundOnly && selected !== "anchovy-bay" ? (
        <p className={styles.mapStatus} role="status">
          Terrain unavailable. Showing simplified land with the existing water view.
        </p>
      ) : null}
      {failed ? (
        <p className={styles.mapStatus} role="status">
          Map preview unavailable. Choose a case below to continue.
        </p>
      ) : null}
    </>
  );
};
export default GeographicMap;
