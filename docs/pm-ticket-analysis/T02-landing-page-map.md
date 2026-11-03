# T02 — Change landing page to a map visualisation showing the areas of the case studies

**Status:** Initial analysis; clarification needed. No implementation approved or started.

## Original PM request

**Title:** Change landing page to a map visualisation showing the areas of the case studies

**Description:** Feedback from co-creation workshop May '26

## Our understanding

Likely change the home page (`/`) so users can see where the case studies are located and select them geographically. The title asks for a map showing case-study areas; it does not define interactions or how much of the current landing design should be replaced.

Current cases:

- Northwestern Mediterranean — UI description mentions GSA06 and GSA07.
- Aegean Sea — UI description mentions GSA22 and GSA23.
- Anchovy Bay — labelled an educational case study; geographic placement needs confirmation.

Those GSA references are existing UI text, not approved map boundary data.

## Suggested concept — not yet approved

- Start with a Mediterranean map showing labelled case-study areas.
- Select an area to reveal a short description and an **Explore case study** button.
- Keep a matching list of cases for keyboard access and mobile use.
- Agree a separate treatment for Anchovy Bay if it has no real geographic location.

## Questions for PM

1. Should the map replace the entire current landing experience, including the intro/video, or sit within the existing design?
2. Should areas use precise boundaries, approximate highlights, or markers? Who supplies/approves their geographic data?
3. Should clicking an area open a preview, the scenario introduction, or the runs page?
4. Does Anchovy Bay represent a real location? If not, how should users access it?
5. Are there workshop notes, sketches, or examples explaining the intended experience?
6. Should unavailable scenarios remain visible, and how should their status appear on the map?

## Existing project locations

Paths are relative to the repository root.

| Area | Location |
| --- | --- |
| Current home page | `src/pages/SimulationCaseSelectionPage/SimulationCaseSelectionPage.tsx` |
| Case names, descriptions, backend-name mapping | `src/data/simulationCases.ts` |
| Backend availability check | `src/hooks/useAvailableScenarios.ts` |
| Existing map implementation to review | `src/features/ScenarioOutputs/components/HeatMap/HeatMap.tsx` |
| Routes | `src/App.tsx` |

MapLibre is already a project dependency. It is a possible reuse option, not a requirement from this ticket.

## Tasks — not started

- [ ] Get PM answers and any workshop references.
- [ ] Agree the map's scope, area representation, Anchovy Bay treatment, and click destination.
- [ ] Obtain approved geographic data if boundaries are required.
- [ ] Agree desktop/mobile layouts, keyboard selection, and availability/error states.
- [ ] After user approval, implement the agreed map and case-study navigation.
- [ ] Verify labels, geographic placement, navigation, and usable mobile/keyboard access.

## Done when

The landing page shows the agreed case-study areas on a map and lets users reach the intended case-study page. Final acceptance details depend on the answers above.
