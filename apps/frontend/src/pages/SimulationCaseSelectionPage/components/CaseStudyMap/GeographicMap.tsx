import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import MarineCaseIdentity from "./MarineCaseIdentity";
import AnimatedWaterLayer from "./water/AnimatedWaterLayer";
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
  backgroundOnly?: boolean;
  expandedCase: SimulationCaseId | null;
  selected: SimulationCaseId | null;
  available: ReadonlySet<SimulationCaseId>;
  reducedMotion: boolean;
  onSelect: (id: SimulationCaseId) => void;
  hovered: SimulationCaseId | null;
  onHover: (id: SimulationCaseId | null) => void;
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
  water?.setAnimationEnabled(!fictional);
  water?.setRegionalPalette(
    scope.closest("[data-selected]")?.getAttribute("data-selected") === "overview",
  );
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
      const camera = { center: [6.164721861770346, 38.48192946871973] as [number, number], zoom: 4.259597210796989 + Math.log2(scale), pitch: 0, bearing: 0 };
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
          paint: { "fill-color": colour, "fill-opacity": 0.065 },
        },
        "land",
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
        paint: {
          "line-color": colour,
          "line-width": northwestern ? 8 : 7,
          "line-blur": 4,
          "line-opacity": northwestern ? 0.48 : 0.32,
        },
      });
      map.addLayer({
        id: `${prefix}-study-outline`,
        type: "line",
        source,
        paint: {
          "line-color": colour,
          "line-width": northwestern ? 2.4 : 1.8,
          "line-opacity": northwestern ? 1 : 0.95,
        },
      });
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
  const markerRoots = useRef(new Map<SimulationCaseId, Root>());
  const buttons = useRef(new Map<SimulationCaseId, HTMLDivElement>());
  const current = useRef(props);
  const water = useRef<AnimatedWaterLayer | null>(null);
  const [waterReady, setWaterReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const { selected, available, reducedMotion, onSelect, hovered, onHover, backgroundOnly } = props;
  useEffect(() => {
    current.current = { ...current.current, selected, available, reducedMotion, onSelect, onHover, backgroundOnly };
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
    const fictional = selected === "anchovy-bay";
    const crossesScene = fictional !== (lastScene.current === "anchovy-bay");
    lastScene.current = selected;
    const applyScene = () => {
      map.stop();
      map.setMaxBounds(null);
      map.setMinZoom(2);
      map.setMaxZoom(8);
      updateStudyArea(map, selected);
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
  }, [selected, available, reducedMotion, onSelect, onHover, backgroundOnly]);

  useEffect(() => {
    current.current = props;
    for (const [caseId, root] of markerRoots.current) {
      const marker = buttons.current.get(caseId);
      if (marker) marker.dataset.expanded = String(props.expandedCase === caseId);
      root.render(createElement(MarineCaseIdentity, {
        caseId, expanded: props.expandedCase === caseId,
        disabled: !props.available.has(caseId),
        onSelect: () => current.current.onSelect(caseId),
      }));
    }
  }, [props, ready]);

  useEffect(() => {
    const map = mapRef.current;
    for (const [id, button] of buttons.current) button.setAttribute("data-hovered", String(hovered === id));
    if (!map || !ready) return;
    for (const { caseId, prefix } of studyAreas) {
      const active = !selected && hovered === caseId;
      if (map.getLayer(`${prefix}-study-fill`)) map.setPaintProperty(`${prefix}-study-fill`, "fill-opacity", active ? 0.2 : 0.065);
      if (map.getLayer(`${prefix}-study-lift`)) {
        map.setPaintProperty(`${prefix}-study-lift`, "fill-extrusion-height-transition", { duration: reducedMotion ? 0 : 220 });
        map.setPaintProperty(`${prefix}-study-lift`, "fill-extrusion-opacity-transition", { duration: reducedMotion ? 0 : 220 });
        map.setPaintProperty(`${prefix}-study-lift`, "fill-extrusion-height", active && !reducedMotion ? 45000 : 0);
        map.setPaintProperty(`${prefix}-study-lift`, "fill-extrusion-opacity", active && !reducedMotion ? 0.16 : 0);
      }
      if (map.getLayer(`${prefix}-study-glow`)) map.setPaintProperty(`${prefix}-study-glow`, "line-opacity", active ? 0.58 : caseId === "aegean-sea" ? 0.32 : 0.48);
      if (map.getLayer(`${prefix}-study-outline`)) map.setPaintProperty(`${prefix}-study-outline`, "line-width", active ? 2.8 : caseId === "aegean-sea" ? 1.8 : 2.4);
    }
  }, [hovered, selected, ready, reducedMotion]);

  useEffect(() => {
    let disposed = false;
    const markers: maplibregl.Marker[] = [];
    const cardRoots: Root[] = [];
    let observer: ResizeObserver | undefined;
    let cardObserver: ResizeObserver | undefined;
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
          interactive: true,
          dragPan: true,
          scrollZoom: true,
          boxZoom: false,
          doubleClickZoom: true,
          keyboard: true,
          touchZoomRotate: true,
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
        map.getCanvas().tabIndex = 0;
        map
          .getCanvas()
          .setAttribute("aria-label", "Mediterranean geographic context");
        const initialiseVisualLayers = () => {
          if (!disposed) {
            try {
              if (!map.getLayer("animated-water")) {
                const waterLayer = new AnimatedWaterLayer(
                  waterColours(map.getContainer()),
                  (available) => {
                    if (!disposed) setWaterReady(available);
                  },
                );
                water.current = waterLayer;
                map.addLayer(waterLayer, "grid");
              }
            } catch {
              setWaterReady(false);
            }
            updateStudyArea(map, current.current.selected);
            updateMapAppearance(
              map,
              water.current,
              current.current.reducedMotion,
            );
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
          button.dataset.expanded = String(current.current.expandedCase === caseId);
          const label = document.createElement("span");
          label.className = styles.markerLabel;
          const cardRoot = createRoot(label);
          cardRoots.push(cardRoot);
          markerRoots.current.set(caseId, cardRoot);
          cardRoot.render(createElement(MarineCaseIdentity, {
            caseId, expanded: current.current.expandedCase === caseId,
            disabled: !current.current.available.has(caseId),
            onSelect: () => current.current.onSelect(caseId),
          }));
          button.addEventListener("mouseenter", () => current.current.onHover(caseId));
          button.addEventListener("mouseleave", () => current.current.onHover(null));
          button.addEventListener("focus", () => current.current.onHover(caseId));
          button.addEventListener("blur", () => current.current.onHover(null));
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
          if (!import.meta.env.DEV) return;
          const center = map.getCenter();
          console.info("SURIMI_MAP_CAMERA " + JSON.stringify({
            scene: current.current.selected ?? "overview",
            center: [center.lng, center.lat], zoom: map.getZoom(),
            bearing: map.getBearing(), pitch: map.getPitch(), padding: map.getPadding(),
            viewport: { width: map.getContainer().clientWidth, height: map.getContainer().clientHeight },
            bounds: map.getBounds().toArray(),
          }));
        };
        map.on("moveend", logCamera);
        const updateCardSpace = () => {
          for (const [id, element] of buttons.current) {
            const location = caseMapPlaces[id].location;
            if (!location) continue;
            const point = map.project(location);
            const viewport = map.getContainer();
            const cardWidth = viewport.clientWidth > 1200 ? 336 : 304;
            const fraction = id === "aegean-sea" ? 0.76 : 0.24;
            const left = Math.min(viewport.clientWidth - cardWidth - 24, Math.max(24, viewport.clientWidth * fraction));
            element.style.setProperty("--card-left", `${left - point.x}px`);
            element.style.setProperty("--card-top", `${112 - point.y}px`);
            element.style.setProperty("--card-room", `${Math.max(200, viewport.clientHeight - 240)}px`);
          }
        };
        map.on("move", updateCardSpace);
        map.on("move", updateConnectors);
        moveCamera(map, current.current.selected, false);
        updateCardSpace();
        updateConnectors();
        observer = new ResizeObserver(() => {
          map.resize();
          updateCardSpace();
          updateConnectors();
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
      cardObserver?.disconnect();
      cardRoots.forEach(root => root.unmount());
      markerRoots.current.clear();
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
        data-map-ready={ready}
        aria-hidden={backgroundOnly || selected === "anchovy-bay" || undefined}
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
      {failed ? (
        <p className={styles.mapStatus} role="status">
          Map preview unavailable. Choose a case below to continue.
        </p>
      ) : null}
    </>
  );
};
export default GeographicMap;
