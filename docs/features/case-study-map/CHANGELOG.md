# Case-study map changelog

## 2026-11-06 — One orange for all study boundaries

User confirmed every study boundary should use the Aegean orange. Added shared light semantic token `--color-map-study-boundary` (alias of `--color-secondary-ink`) and use it for all overlay outlines, glows and fills. Case marker accents and distinct sea backgrounds remain unchanged. Updated feature README, T02 and platform changelog.

**Verified:** browser checks confirm both boundary outlines resolve to the same `#9e4919`, original glow remains, and both new water colours remain intact. Build passes; full lint retains 18 existing errors/5 warnings. No backend or dependency changes.

## 2026-11-06 — Restore preferred warm boundaries

User preferred the original orange/coral boundaries over white outlines. Restored original case accents and faint glow in `GeographicMap.tsx`; removed obsolete study-line/casing aliases from the map stylesheet. New marine/azure water palettes are unchanged.

**Verified:** build passes; browser checks confirm Aegean orange (`--color-secondary-ink`), Northwestern coral/red (`--color-primary`), original glow and both new water backgrounds. Full lint retains 18 existing errors/5 warnings. No geometry, layout, backend or dependency changes. Updated feature README, platform changelog and T02.

## 2026-11-06 — Distinct Northwestern and Aegean background palettes

**User requested:** styling-only sea identities, using the supplied marine/azure colours and the existing token architecture. Preserve layout, content, typography and functionality; no dependencies or new ornaments.

- Palette/light semantic files centralize both sea identities. `CaseStudyMap.module.css` scopes them to the two selected sea scenes; overview and Anchovy inherit their original palette. Removed the selected-sea ambient wash.
- `GeographicMap.tsx` resolves scoped CSS colours for the existing GPU surface and static fallback. Boundary geometry is unchanged; an unblurred thin white line with dark casing replaces the decorative glow for contrast against water and land.
- `water/AnimatedWaterLayer.ts` updates colours in place and blends during the existing 1.7-second camera transition. It reuses the capped scheduler, settles even when wave motion is paused, and applies colours immediately for reduced motion. No renderer, shader, perpetual loop, texture or dependency added. Scene dimensions, controls and destinations are unchanged.

**Verified:** TypeScript/production build passes; all 26 network tests pass. Full lint remains at the existing 18 errors/5 warnings with no new errors in changed files. Controlled Chrome checks at desktop 1440×1000, tablet 1024×900 and mobile 390×844 confirm semantic colours, actual Northwestern water darker than Aegean, existing text readability, case switching, palette settling while paused, Resume, reduced motion, static fallback, overview/Bay restoration and no uncaught browser errors. Direct WebGL reads exclude the independent existing marker pulse from pause comparisons. Token contrast checks: heading on light surface 15.73:1, body 6.75:1, primary-button text 5.95:1, white outline against its dark casing 11.37:1 (Northwestern) and 5.42:1 (Aegean).

**Limits:** no across-device performance benchmark or live simulation test; final colour acceptance remains with the user. No backend/protocol/deployment/CI/dependency changes; nothing committed. Updated both feature READMEs/changelogs, T02 and the platform changelog.

**Deploy:** frontend rebuild only.

## 2026-11-06 — Wider overview, official Northwestern boundaries and full Bay illustration

- `mock-data/caseMap.ts`, `GeographicMap.tsx`: removed country-name data/markers; widened overview bounds; load official GSA 06 + 07 on first Northwestern selection and fit the complete extent. Shared overlay handling hides each unselected case's geometry. Existing GSA 22 + 23 remains unchanged.
- `public/maps/northwestern-gsa-06-07.geojson` and provenance README: original FAO/GFCM coordinates retained, source comparison verified. These published fisheries areas match current case metadata; final model-domain approval remains with the project team.
- `UseCaseSelector.module.css`, `CaseStudyMap.module.css`: equal fractional option widths, bottom-right Anchovy inset and responsive clearance from the selector. Complete upright Bay image uses contain sizing, with no negative offset, rotation or edge mask.
- `CaseStudyMap.tsx`, `GeographicMap.tsx`, `water/shaders.ts`: one water layer continues beneath the transparent Bay illustration, with real-world geometry/markers and geography credits hidden there. Broader moving ripples and stronger reflections make motion visible. Default running, explicit pause/resume, reduced motion and fallback remain supported.

**Verified:** build passes; all 26 network tests pass. Full lint remains at 18 existing errors/5 warnings, with no errors in touched map code. Controlled browser checks at 1920×932 and 390×844 verify equal widths, wider frame, lower-right inset, both sea overlays and exclusive visibility, upright contained Bay, actual changing canvas pixels, stable paused pixels, functional Resume, live reduced motion, restored geographic layers on Back and no uncaught browser errors. Exact source-geometry comparison passes for both newly extracted features. No backend/protocol/deployment/CI/dependency changes; nothing committed. See feature README, T02, feature index, root README and map provenance for updated documentation.

## 2026-11-06 — Compact glass UseCaseSelector and locked overview

**User requested:** replace the large numbered cards with minimal `UseCaseSelector`, remove the perspectives heading and illustrative-location footer, fit both seas more closely, disable manual map navigation and remove top-right map controls. Investigate the error seen on refresh.

- Added `components/presentational/UseCaseSelector/` with display-ready options, availability, controlled selection and callback/ref. It composes shared React Aria buttons in a compact glass surface, with no ordinal numbers, categories or prop playground. It replaces and removes the former `CaseStudyOption` implementation. `/design-system` previews the actual new control.
- `CaseStudyMap` owns the floating centered selector placement and feature-data mapping; Back restores focus through the selector ref. Removed the two requested text lines and unused ordinal presentation data. The mobile illustrated Bay inset is positioned below the Aegean marker.
- `GeographicMap` uses `interactive: false` for all mouse/touch/keyboard map navigation. Programmed camera fitting/flights and native marker buttons remain active. Tightened overview bounds and corrected retained camera padding so both study markers fit desktop/mobile. Removed zoom controls entirely. Water pause/resume is an unobtrusive footer action, not a navigation control.
- **Refresh cause found in live local API logs:** a 502 `controller_error` from `GetScenarioNames` reported an SSL connection failure; the next request succeeded. Earlier 504 timeouts were also logged. No backend code was changed. Catalogue read options now retry network/502/503/504 failures twice (1s/2s backoff), leave loading visible until retries finish, retain explicit terminal errors/request references, and preserve a last-known map with a visible notice if only a background check fails. Authentication/authorization/schema failures and writes do not inherit retries.

**Verified:** production build passes; full lint remains at the known 18 errors/5 warnings. All 26 network tests pass, including transient read recovery, bounded persistent failure, and no replay for forbidden/invalid responses. Controlled browser checks verify no error-screen flash while transient 502s recover, compact selector size/copy, disabled gesture handlers and unchanged camera after drag/wheel/double-click, marker-driven camera movement and GSA overlay, keyboard focus return, footer water pause, both seas/mobile inset clearance, persistent-error/manual recovery, cached-data notice, single-attempt 403/schema errors, real selector preview and no uncaught browser errors.

**Limits:** the upstream SSL/timeout condition remains an external issue; FE retries improve recovery rather than repairing it. Runtime logs were read only; browser failure scenarios were controlled. No backend/protocol/deployment/CI/dependency change. Nothing committed.

## 2026-11-06 — Light case selector and animated water

**User confirmed:** apply the new light theme to the complete case-selection experience and use animated waves/reflections rather than satellite imagery.

- `CaseStudyMap` now uses semantic light surfaces/type/spacing/radii, shared React Aria actions and the new `CaseStudyOption` presentational composition. All three cases, compact Aegean switcher, header, footer and illustrated Bay follow the light visual language. The original unused cinematic view remains preserved.
- `CaseStudyOption` receives display-ready labels, availability/selection and callbacks, without domain/API objects. Case accents in `mock-data/caseMap.ts` reference shared semantic tokens; canvas colours resolve from the same light theme. Header links to `/design-system`.
- `SessionMenu` now uses the shared outlined Button and its own semantic stylesheet; obsolete session styles were removed from the auth-screen sheet. Logout behaviour is unchanged.
- `water/AnimatedWaterLayer.ts` and `water/shaders.ts` add world-aligned procedural wave-normal/reflection shading beneath opaque land polygons. This is decorative water, not satellite imagery, measured wave heights, currents or bathymetry. No tiles, textures, new libraries or external service are required.
- Idle animation requests repaint at approximately 30 fps, with capped canvas pixel ratio. Pause/resume is available; reduced motion renders a still surface. `usePrefersReducedMotion` subscribes to live system changes. Hidden tabs and Bay selection stop the animation. Map removal releases timers, listeners and GPU resources.
- MapLibre 5 drops custom layers on graphics-context loss: the owner re-adds the water layer when the style is restored. Shader initialization failure leaves the static geographic map and case navigation usable. Map controls/status now sit above the visual scrim, and country labels remain behind study markers.
- Official GSA 22 + 23 coordinates, lazy boundary loading, camera transitions, authenticated availability and explicit introduction/example-run destinations remain connected.

**Verified:** production build and targeted changed-code lint pass; full lint remains at 18 existing errors/5 warnings. All 23 network tests pass. Browser checks with controlled auth/catalogue responses and real local geographic assets verify desktop/mobile overview/previews, official Aegean overlay, illustrated Bay navigation, keyboard focus, live reduced motion, actual canvas pixels changing during animation and staying identical during pause, recovery after simulated WebGL context loss, forced shader failure with functional static navigation, and no uncaught JavaScript/shader errors.

**Limits:** palette/water realism remain for user visual review. No scientific data, live backend exchange or simulation execution was introduced. Hidden-tab stopping and GPU cleanup are read from source; desktop Chrome tests do not guarantee performance on every device. No backend/protocol/deployment/CI/dependency change. Nothing committed.

**Deploy:** rebuild frontend assets; no new configuration or service.

## 2026-11-06 — Immersive selected Aegean view

**User authorized:** closer map framing, retain the official border with a faint glow and lighter fill, remove the floating study marker and large editorial heading, and use compact navigation.

- `CaseStudyMap.tsx` presents a small Aegean/GSA identity beside the top Back control, a short bottom description with introduction/example-run actions, and a compact case switcher. The preview retains keyboard focus and the Back return target.
- `GeographicMap.tsx` fits both official subareas into more of the screen, retains gentle desktop tilt/rotation, hides geographic markers during Aegean selection, and restores them on return. A blurred line layer adds a restrained glow; fill opacity is reduced. Geometry and lazy loading are unchanged.
- The stylesheet keeps the immersive composition responsive; overview, Northwestern and Anchovy previews retain their existing layouts. Descriptive text remains centralized in `mock-data/caseMap.ts`.

**Verified:** production build and targeted case-selection lint pass. Full lint remains at 18 existing errors and 5 warnings outside these files. Isolated browser checks with controlled auth/catalogue responses verify real geographic assets, hidden selected markers, desktop/mobile framing of both subareas, normal/reduced-motion selection, case switching, Back restoring markers, introduction navigation and no uncaught JavaScript errors. The local backend was not part of these checks.

**Deploy:** frontend rebuild only. No dependency/backend/protocol/deployment/CI change. Nothing committed automatically.

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
