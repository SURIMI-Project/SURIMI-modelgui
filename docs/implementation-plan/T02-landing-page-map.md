# T02 — Change landing page to a map visualisation showing the areas of the case studies

**Planning update — 2026-11-05:** This is the signed-in case-selection page, not a public landing page. The user wants to explore two design approaches and will describe them in the ticket discussion. Neither approach is defined or approved yet; the original map request remains reference context. Later work, after T05 and T06; exact priority pending.

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

## Defining questions

1. What are the two design approaches you want to try, and what existing content should each preserve?
2. How should the real case-study areas and Anchovy Bay appear, and who approves any geographic boundaries?
3. What should selecting a case do: show a preview, open its introduction, or open its runs?

## Existing project locations

Paths are relative to the repository root.

| Area | Location |
| --- | --- |
| Current home page | `apps/frontend/src/pages/SimulationCaseSelectionPage/SimulationCaseSelectionPage.tsx` |
| Case names, descriptions, backend-name mapping | `apps/frontend/src/data/simulationCases.ts` |
| Backend availability check | Removed in T05; current case entries come from `apps/frontend/mock-data/caseStudies.ts` |
| Existing map implementation to review | `apps/frontend/src/features/ScenarioOutputs/components/HeatMap/HeatMap.tsx` |
| Routes | `apps/frontend/src/App.tsx` |

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
