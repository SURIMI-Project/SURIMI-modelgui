# Case-study map changelog

## 2026-11-06 — Aegean GSA 22 + 23 boundaries

**Confirmed:** user selected official GFCM GSA 22 (Aegean Sea) and GSA 23 (Crete) as the requested study-area representation.

- Added `public/maps/aegean-gsa-22-23.geojson`, extracted from the archive linked by the official FAO/GFCM catalogue. Original geometry coordinates and island holes are preserved without simplification or union. Source, archive hash, CRS, conversion fields and attribution are recorded in `public/maps/README.md`.
- `GeographicMap.tsx` lazily adds a fill and outline source on first Aegean selection, reuses it afterwards, and hides the layers on all other selections. Camera fitting includes both subareas, clears retained padding before calculating bounds, and leaves space for the desktop/mobile preview. Desktop retains tilt; portrait uses a top-down rotated view to keep the full extent above the text.
- `mock-data/caseMap.ts` centralizes overlay label, asset URL, provenance URL and outward-rounded camera extent. The geometry itself is source reference data, not a mock dataset.
- `CaseStudyMap.tsx` and its stylesheet add the study-area legend and FAO/GFCM credit. T02, feature/index and global changelog now distinguish confirmed Aegean boundaries from the outstanding Northwestern overlay.

**Verified:** production build and targeted case-selection ESLint pass. Full lint remains at the existing 18 errors and 5 warnings in unrelated files. Converted geometry equals the official shapefile geometry for both records. Isolated Chrome checks pass for desktop rendering of both subareas, lazy download (zero requests on overview, one after repeated selection), hiding on overview/other cases, full portrait bounds above preview controls, normal/reduced-motion selection, and no uncaught JavaScript errors.

**Verification limits:** local backend was not running in this session. Browser checks used controlled auth/catalogue responses and the real local geographic assets; no auth/backend behaviour was changed or revalidated. Final PM visual acceptance and additional model-grid detail remain outside these checks.

**Deploy:** rebuild frontend assets. No backend/protocol/deployment/CI/dependency change; no commit created.

## 2026-11-05 — Cinematic map entrance implemented for review

**Verified:** production build passes; targeted ESLint for the entire case-selection page and new map content passes. All 23 existing network tests pass. Full frontend lint reports 18 existing errors and 5 warnings in unrelated files; current counts recorded in `docs/ISSUES.md`.

- `SimulationCaseSelectionPage.tsx` retains the shared REST loading/error/retry boundary and now mounts `CaseStudyMap` after successful availability loading.
- `components/CinematicCaseSelection/` preserves the previous video/cards view and its stylesheet as an unused component accepting the same scenario response.
- `components/CaseStudyMap/` adds geographic overview, camera flights, personalized previews, explicit introduction/example-run navigation, back navigation, reduced-motion handling and a case-list fallback.
- `mock-data/caseMap.ts` centralizes presentation copy, colours and illustrative camera/label positions.
- `public/maps/` bundles Natural Earth geographic context with documented provenance; `public/useCasesInfo/anchovy-bay-one-river.svg` preserves the supplied educational illustration unchanged.
- T02, feature index, global changelog, root README and mock-data index describe the current implementation. Existing auth loading-flash notes remain preserved.

**Browser verified:** local Vite + existing backend login/catalogue, desktop and portrait mobile layout, all three previews, Back, introduction and example-run links, keyboard focus/return, normal camera animation, reduced motion, delayed catalogue loading without disabled-case flash, missing-case availability, WebGL failure with functional selection/navigation, and no uncaught browser JavaScript errors. Short desktop layout was corrected after fallback testing found overlapping controls.

**Not verified:** PM visual acceptance or exact scientific model boundaries. No simulation was submitted or executed; existing fixed example reports remain unchanged.

**Deploy:** rebuild frontend assets. No new dependency, API key, migration or tracked backend/protocol/deployment/CI change. Nothing committed automatically.
