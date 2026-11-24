import { regionalTerrainBounds, terrainAssets } from "./terrainAssets";
import loadMapImage, { type MapImage } from "./loadMapImage";

export type LandMask = {
  canvas: MapImage;
  bounds: [number, number, number, number];
};

/** Precomputed from the same local coastline geometry, without a runtime GeoJSON wait. */
export default async function loadLandMask(): Promise<LandMask> {
  return { canvas: await loadMapImage(terrainAssets.maskUrl), bounds: regionalTerrainBounds };
}
