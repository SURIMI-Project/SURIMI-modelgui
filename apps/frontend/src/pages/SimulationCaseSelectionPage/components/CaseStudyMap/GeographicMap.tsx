import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as LibreMap } from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { FiMinus, FiPlus } from "react-icons/fi";
import { aegeanStudyArea, caseMapPlaces, mapCountryLabels, overviewBounds } from "../../../../../mock-data/caseMap";
import type { SimulationCaseId } from "../../../../data/simulationCases";
import styles from "./CaseStudyMap.module.css";

type Props = {
  selected: SimulationCaseId | null;
  available: ReadonlySet<SimulationCaseId>;
  reducedMotion: boolean;
  onSelect: (id: SimulationCaseId) => void;
};

const graticule: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [
    ...Array.from({ length: 12 }, (_, index) => ({ type: "Feature" as const, properties: {},
      geometry: { type: "LineString" as const, coordinates: [[-20 + index * 6, 22], [-20 + index * 6, 58]] } })),
    ...Array.from({ length: 10 }, (_, index) => ({ type: "Feature" as const, properties: {},
      geometry: { type: "LineString" as const, coordinates: [[-25, 24 + index * 4], [50, 24 + index * 4]] } })),
  ],
};

const moveCamera = (map: LibreMap, selected: SimulationCaseId | null, animate: boolean) => {
  const width = map.getContainer().clientWidth;
  const mobile = width < 760;
  const place = selected ? caseMapPlaces[selected] : null;
  const duration = animate ? 1700 : 0;
  if (!place?.location) {
    map.fitBounds(overviewBounds, { duration, pitch: 0, bearing: 0,
      padding: mobile ? { top: 370, bottom: 210, left: 24, right: 24 }
        : { top: 140, bottom: 210, left: Math.min(width * .25, 360), right: 80 } });
    return;
  }
  if (selected === "aegean-sea") {
    // cameraForBounds includes retained camera padding; clear it before computing our own frame.
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    const camera = map.cameraForBounds(aegeanStudyArea.bounds, {
      bearing: place.bearing,
      padding: mobile ? { top: 90, bottom: 585, left: 40, right: 40 }
        : { top: 135, bottom: 210, left: width < 1050 ? 410 : 520, right: 90 },
      maxZoom: place.zoom,
    });
    if (camera?.zoom !== undefined) {
      const target = { ...camera, zoom: camera.zoom - (mobile ? .05 : .25), pitch: mobile ? 0 : 42, padding: { top: 0, bottom: 0, left: 0, right: 0 } };
      if (animate) map.flyTo({ ...target, duration, essential: false });
      else map.jumpTo(target);
      return;
    }
  }
  const options = { center: place.location, zoom: mobile ? place.zoom - .6 : place.zoom,
    pitch: mobile ? 26 : 42, bearing: place.bearing,
    padding: mobile ? { top: 85, bottom: 360, left: 20, right: 20 }
      : { top: 110, bottom: 180, left: 480, right: 80 } };
  if (animate) map.flyTo({ ...options, duration, essential: false });
  else map.jumpTo(options);
};

// Add the official data only on first Aegean selection; reuse it on later visits.
const updateStudyArea = (map: LibreMap, selected: SimulationCaseId | null) => {
  if (!map.getLayer("coasts")) return;
  const visible = selected === "aegean-sea";
  if (visible && !map.getSource("aegean-study-area")) {
    map.addSource("aegean-study-area", { type: "geojson", data: aegeanStudyArea.asset });
    map.addLayer({ id: "aegean-study-fill", type: "fill", source: "aegean-study-area",
      paint: { "fill-color": caseMapPlaces["aegean-sea"].colour, "fill-opacity": .16 } }, "land");
    map.addLayer({ id: "aegean-study-outline", type: "line", source: "aegean-study-area",
      paint: { "line-color": caseMapPlaces["aegean-sea"].colour, "line-width": 1.8, "line-opacity": .95 } });
  }
  for (const id of ["aegean-study-fill", "aegean-study-outline"]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }
};

const GeographicMap = (props: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const buttons = useRef(new Map<SimulationCaseId, HTMLButtonElement>());
  const current = useRef(props);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const { selected, available, reducedMotion, onSelect } = props;
  useEffect(() => {
    current.current = { selected, available, reducedMotion, onSelect };
    for (const [id, button] of buttons.current) {
      const dimmed = Boolean(selected && selected !== id);
      button.disabled = !available.has(id) || selected === "anchovy-bay";
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
          center: [13, 38], zoom: 4, minZoom: 2, maxZoom: 8,
          attributionControl: false, renderWorldCopies: false,
          style: {
            version: 8,
            sources: {
              land: { type: "geojson", data: "/maps/mediterranean-context.geojson" },
              grid: { type: "geojson", data: graticule },
            },
            layers: [
              { id: "water", type: "background", paint: { "background-color": "#092c3c" } },
              { id: "grid", type: "line", source: "grid", paint: { "line-color": "#446a75", "line-opacity": .2, "line-width": 1 } },
              { id: "land", type: "fill", source: "land", paint: { "fill-color": "#17383d", "fill-opacity": 1 } },
              { id: "coasts", type: "line", source: "land", paint: { "line-color": "#62827a", "line-opacity": .55, "line-width": 1 } },
            ],
          },
        });
        mapRef.current = map;
        map.scrollZoom.disable();
        map.keyboard.disable();
        map.getCanvas().tabIndex = -1;
        map.getCanvas().setAttribute("aria-label", "Mediterranean geographic context");
        map.on("load", () => {
          if (!disposed) {
            updateStudyArea(map, current.current.selected);
            setReady(true);
          }
        });
        map.on("error", () => { if (!disposed) setFailed(true); });

        for (const [id, place] of Object.entries(caseMapPlaces)) {
          if (!place.location) continue;
          const caseId = id as SimulationCaseId;
          const button = document.createElement("button");
          button.type = "button";
          button.className = styles.mapMarker;
          button.style.setProperty("--case-accent", place.colour);
          button.setAttribute("aria-label", `Preview ${place.title}`);
          button.setAttribute("aria-pressed", String(current.current.selected === caseId));
          const dimmed = Boolean(current.current.selected && current.current.selected !== caseId);
          button.disabled = !current.current.available.has(caseId) || current.current.selected === "anchovy-bay";
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
          button.addEventListener("click", () => current.current.onSelect(caseId));
          buttons.current.set(caseId, button);
          markers.push(new maplibregl.Marker({ element: button, anchor: "bottom", offset: [0, 14] }).setLngLat(place.location).addTo(map));
        }
        for (const label of mapCountryLabels) {
          const text = document.createElement("span");
          text.className = styles.countryLabel;
          text.textContent = label.name;
          text.setAttribute("aria-hidden", "true");
          markers.push(new maplibregl.Marker({ element: text, anchor: "center" }).setLngLat(label.location).addTo(map));
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
    };
  }, []);

  return (
    <div className={styles.mapLayer} aria-hidden={props.selected === "anchovy-bay" || undefined}>
      <div ref={container} className={styles.mapCanvas} />
      {failed || !ready ? <p className={styles.mapStatus} role="status">
        {failed ? "Map preview unavailable. Choose a case below to continue." : "Preparing the map…"}
      </p> : null}
      {ready && props.selected !== "anchovy-bay" ? (
        <div className={styles.mapControls} aria-label="Map controls">
          <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn({ duration: props.reducedMotion ? 0 : 350 })}><FiPlus /></button>
          <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut({ duration: props.reducedMotion ? 0 : 350 })}><FiMinus /></button>
        </div>
      ) : null}
    </div>
  );
};
export default GeographicMap;
