# Geographic context

`mediterranean-context.geojson` is derived from Natural Earth's `ne_50m_admin_0_countries.geojson`, retrieved 2026-11-05 from:
https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson

All 242 country features are retained with original geometry coordinates; only the `ADMIN` property is retained (renamed `name`). Keeping the whole geographic context allows a portrait viewport to fit both study markers without clipping or replacing outlying land with blank water. No geometries are clipped or simplified further. These are basemap country/coastline features, not approved fisheries/model-domain boundaries.

Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/ . The interface includes a Natural Earth credit for provenance. This local asset avoids an external tile service or API key for the case-selection prototype.

## Aegean study-area boundaries

`aegean-gsa-22-23.geojson` contains only GSA 22 (Aegean Sea) and GSA 23 (Crete), confirmed by the user on 2026-11-06.

- Publisher: Food and Agriculture Organization of the United Nations (FAO), General Fisheries Commission for the Mediterranean (GFCM).
- Catalogue: https://www.fao.org/gfcm/data/maps/geographical-subareas/en
- Official archive linked by that catalogue: https://gfcmsitestorage.blob.core.windows.net/website/5.Data/ArcGIS/GFCM_GSA.zip
- Retrieved: 2026-11-06. Source archive file timestamps: 2025-12-16/17.
- Downloaded archive SHA-256: `307ae3dcd2e8d2f19cb4fd794af8a799d83f59247bf1b2cda3cea90844bc543a`.
- Source shapefile: `GFCM_GSA/gfcm_gsa.shp`, with its DBF/PRJ. Coordinate reference system is WGS 84 longitude/latitude in degrees; no reprojection is required.
- Conversion: pyshp 3.1.6, installed only in a temporary directory outside the repository. Select records with `SECT_COD` equal to `GSA22` or `GSA23`, convert each shape using `shape.__geo_interface__`, retain `SMU_CODE` as feature id, `SECT_COD` as `properties.code`, and `SMU_NAME` as `properties.name`. Serialize as a GeoJSON FeatureCollection.
- All original geometry coordinates and island holes are retained. No rounding, simplification, clipping, smoothing or union is applied. The two features preserve their shared subarea division.
- Verified: converted geometry JSON equals the corresponding source geometry for both records. GSA22 contains 108,482 source points; GSA23 contains 15,972.

The frontend credits FAO/GFCM on selection. Natural Earth's public-domain statement above applies to the basemap, not this separate FAO/GFCM dataset. Published fisheries subareas are the chosen representation of this study area; no additional model-grid precision is asserted. Small differences from the Natural Earth coastline may occur because the datasets have different detail levels.

## Northwestern Mediterranean study-area boundaries

`northwestern-gsa-06-07.geojson` contains GSA 06 (Northern Spain) and GSA 07 (Gulf of Lion), matching the existing case metadata. Added 2026-11-06 following the user's request to fix this case's boundaries. Publisher, catalogue, archive, retrieval date, SHA-256, WGS 84 CRS and temporary pyshp conversion are the same as the Aegean dataset above; select `SECT_COD` values `GSA06` and `GSA07`.

**Verified:** both converted geometries match their original shapefile geometries exactly. Retained 20,575 points for GSA06 and 20,780 for GSA07, including holes and their shared division. No rounding, simplification, smoothing, clipping or union. The camera bounds are rounded outward for framing only; geometry remains unchanged. The FAO/GFCM credit appears when this case is selected. Project approval of these published fisheries areas as the final model domain remains separate from faithful extraction.
