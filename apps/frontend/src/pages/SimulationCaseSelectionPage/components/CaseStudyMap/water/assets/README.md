# Bundled terrain textures

- Source: Natural Earth SR_50M 3.2.0, derived from SRTM Plus elevation data.
- Download: https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip
- Dataset: https://www.naturalearthdata.com/downloads/50m-raster-data/50m-shaded-relief/
- License: public domain, https://www.naturalearthdata.com/about/terms-of-use/
- Provenance, bounds, dimensions, file sizes and archive checksum: `terrain-metadata.json`.

The raster is projected from geographic coordinates to the same Web Mercator region
used by the shader. The complete source lighting range is retained, including
highlights above the dataset's flat-ground value recorded in the metadata.
The neutral grey material colours and animated water remain in the shader.
These files provide geographic context, not model outputs.

`terrain-preview.jpg` and `terrain-mask.png` are preloaded from the HTML document.
The map renders this small preview without waiting for country GeoJSON or an
external map export. It requests `terrain-detail.jpg` or `terrain-medium.jpg` only
after the first terrain frame is visible. A failed detail request retains the
preview. Vite emits content-hashed image URLs for browser caching.

The land mask is built from `public/maps/mediterranean-context.geojson` at twice its
final resolution, reduced to 2048 pixels wide and thresholded to a one-bit PNG.
The renderer uses that same binary land/water classification. Country outlines
and the official fisheries polygons remain separate, unchanged vector layers.

Rebuild with Python and Pillow:

```sh
python3 scripts/prepare-terrain-assets.py /path/to/SR_50M.zip
```

The original world raster and temporary build dependencies are not distributed
with the app. No Esri imagery is bundled or requested at runtime.
