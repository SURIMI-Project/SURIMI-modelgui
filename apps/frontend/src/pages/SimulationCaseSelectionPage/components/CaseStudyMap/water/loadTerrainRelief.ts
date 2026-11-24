import type { Map as LibreMap } from "maplibre-gl";
import { terrainAssets } from "./terrainAssets";
import loadMapImage from "./loadMapImage";

/** A small local preview starts the scene; detailed terrain can arrive after it is visible. */
export default async function loadTerrainRelief(map: LibreMap, quality: "preview" | "detail" = "preview") {
  if (quality === "preview") return loadMapImage(terrainAssets.previewUrl);
  const gl = map.getCanvas().getContext("webgl2");
  const limit = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) as number : 2048;
  const url = limit >= 3072 && map.getContainer().clientWidth >= 760
    ? terrainAssets.detailUrl : terrainAssets.mediumUrl;
  return loadMapImage(url);
}
