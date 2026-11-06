# T02 — Signed-in case selection with a cinematic map

**Updated 2026-11-05:** User approved implementation of the large-map concept. First frontend version implemented; visual review remains pending. On 2026-11-06 the user confirmed GSA 22 + 23 for the Aegean overlay.

## Agreed experience

- Preserve the previous video/cards view as an unused `CinematicCaseSelection` component.
- Show the Mediterranean with labelled, gently pulsing entrances for Northwestern Mediterranean and Aegean Sea.
- Show Anchovy Bay separately as an educational inset using the supplied illustration; do not invent a geographic location.
- Selecting a case opens a personalized preview with a cinematic camera transition. Explicit buttons open its introduction or example runs. Back returns to the overview.
- Keep matching case buttons for keyboard/mobile access and when the map cannot render.
- Retain login and real REST scenario availability. Wait for the first response before displaying cases; keep loading/error/retry states.

## Implemented

- [x] Preserve the original view independently of the active route.
- [x] Build overview, three previews, back navigation and existing destination links.
- [x] Reuse MapLibre with locally bundled Natural Earth geographic context; no new dependency or map-service key.
- [x] Centralize presentation content and illustrative camera positions in `apps/frontend/mock-data/caseMap.ts`.
- [x] Support mobile, reduced motion and a case-list fallback for WebGL failure.

## Still needs agreement

1. Does the PM approve this visual direction and preview-before-navigation behaviour?
2. Who provides and approves the Northwestern Mediterranean boundary polygons? Aegean is confirmed as official GFCM GSA 22 + 23.

Overview markers show **illustrative locations**. The user confirmed the official GFCM GSA 22 + 23 dataset for the selected Aegean study-area overlay on 2026-11-06. Northwestern Mediterranean still has no boundary overlay; its GSA06/GSA07 description alone does not constitute approved polygon data. The supplied Anchovy SVG wraps a bitmap: it is used unchanged as an illustration. Its inclusion here does not complete the separate T04 introduction redesign.

## Files

| Area | Location |
| --- | --- |
| Shared REST loading/error boundary | `apps/frontend/src/pages/SimulationCaseSelectionPage/SimulationCaseSelectionPage.tsx` |
| Active map view | `apps/frontend/src/pages/SimulationCaseSelectionPage/components/CaseStudyMap/` |
| Preserved original view | `apps/frontend/src/pages/SimulationCaseSelectionPage/components/CinematicCaseSelection/` |
| Presentation content | `apps/frontend/mock-data/caseMap.ts` |
| Geographic asset and provenance | `apps/frontend/public/maps/` |
| Detailed design and verification | `docs/features/case-study-map/` |

No backend, protocol, deployment or API changes. Reports remain the existing fixed example.
