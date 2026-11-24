import detailUrl from "./assets/terrain-detail.jpg";
import mediumUrl from "./assets/terrain-medium.jpg";
import previewUrl from "./assets/terrain-preview.jpg";
import maskUrl from "./assets/terrain-mask.png";
import metadata from "./assets/terrain-metadata.json";

export const terrainFlatGround = metadata.lighting_flat_ground;

export const terrainAssets = { detailUrl, mediumUrl, previewUrl, maskUrl };
export const regionalTerrainBounds: [number, number, number, number] = [
  metadata.bounds_mercator_normalized[0], metadata.bounds_mercator_normalized[1],
  metadata.bounds_mercator_normalized[2], metadata.bounds_mercator_normalized[3],
];
