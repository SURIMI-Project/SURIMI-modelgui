import type { Map as LibreMap, LayerSpecification } from "maplibre-gl";

// Invented scene coordinates in an isolated Pacific extent. They carry no real-world claim.
export const anchovyBayScene = {
  asset: "/maps/anchovy-bay-fictional.geojson",
  bounds: [[-144.6, -6.05], [-141.3, -2.65]] as [[number, number], [number, number]],
  navigationBounds: [[-149, -9], [-137, 0]] as [[number, number], [number, number]],
};

const source = "anchovy-fictional";
const layers: LayerSpecification[] = [
  { id: "bay-shallows", type: "fill", source, filter: ["==", "kind", "shallows"], paint: { "fill-color": "#66c7bd", "fill-opacity": 0.22 } },
  { id: "bay-land", type: "fill", source, filter: ["==", "kind", "land"], paint: { "fill-color": "#68765a" } },
  { id: "bay-earth", type: "fill", source, filter: ["==", "kind", "earth"], paint: { "fill-color": "#a29670", "fill-opacity": 0.24 } },
  { id: "bay-vegetation", type: "fill", source, filter: ["==", "kind", "vegetation"], paint: { "fill-color": ["match", ["get", "tone"], 0, "#425e49", 1, "#7b8960", "#536f50"], "fill-opacity": 0.248 } },
  { id: "bay-beach", type: "fill", source, filter: ["==", "kind", "beach"], paint: { "fill-color": "#e4d1a5" } },
  { id: "bay-rocky-shore", type: "fill", source, filter: ["==", "kind", "rocky-shore"], paint: { "fill-color": "#9b9885" } },
  { id: "bay-coast", type: "line", source, filter: ["==", "kind", "coast"], paint: { "line-color": "#e3dcc3", "line-opacity": 0.65, "line-width": 1.2 } },
  { id: "bay-rocks", type: "fill", source, filter: ["==", "kind", "rock"], paint: { "fill-color": "#8c8b77" } },
  { id: "bay-rock-highlights", type: "fill", source, filter: ["==", "kind", "rock-highlight"], paint: { "fill-color": "#b7b098", "fill-opacity": 0.7 } },
];

export function updateAnchovyBay(map: LibreMap, visible: boolean) {
  if (visible && !map.getSource(source)) {
    map.addSource(source, { type: "geojson", data: anchovyBayScene.asset });
    for (const layer of layers) map.addLayer(layer);
  }
  for (const layer of layers) {
    if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
  }
}
