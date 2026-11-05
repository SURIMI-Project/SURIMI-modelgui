# T04 — Anchovy bay Intro Screen

**Planning update — 2026-11-05:** Later introduction/design work, after T05 and T06; exact priority pending. The confirmed login-first flow also applies to this screen. Asset placement and interactions still need the ticket-specific discussion.

**Status:** Asset supplied; intended screen change needs clarification. No implementation approved or started.

## Supplied information

- **Title:** Anchovy bay Intro Screen
- **Description:** None provided.
- **Asset:** `Anchovy-Bay-one-river.svg`
- **Current local location:** `/Users/spyroskalimeris/Desktop/Anchovy-Bay-one-river.svg` — not copied into the repository.

## What the asset contains

A 1254 × 1254 illustration of a bay's coastline, terrain, islands, and a river, with a transparent water area. The SVG wraps an embedded PNG; it does not provide separately editable vector shapes or a screen layout.

The asset does not specify placement, text, buttons, or interactions. Its metadata describes the image, not implementation requirements.

## Our understanding — to confirm

Likely use the illustration on the Anchovy Bay introduction page at `/scenario/anchovy-bay`. It might replace the current illustration, become a background, or belong to a larger redesign. The ticket does not establish which.

## Defining questions

1. Is the target `/scenario/anchovy-bay`, and does the asset replace the illustration or support a redesigned screen?
2. What layout, copy, and buttons should the screen have?
3. Is the final image static, or are specific interactions/animations expected, including behind the transparent water?

## Existing project locations

Paths below are relative to the repository root.

| Area | Location |
| --- | --- |
| Introduction page | `apps/frontend/src/pages/ScenarioWorldPage/ScenarioWorldPage.tsx` |
| Anchovy Bay page configuration/copy | `apps/frontend/mock-data/content/caseIntroductions.ts` (copy); `apps/frontend/src/constants/scenarioWorldConfig.tsx` (component mapping) |
| Anchovy Bay feature | `apps/frontend/src/features/InformationalScenarios/anchovyBay/AnchovyBayFeature.tsx` |
| Current illustration component | `apps/frontend/src/features/InformationalScenarios/anchovyBay/components/AnchovyBayPlaceholderCard/AnchovyBayPlaceholderCard.tsx` |
| Current illustration asset | `apps/frontend/public/useCasesInfo/info_anchovy_bay.webp` |

## Tasks — not started

- [ ] Confirm the target screen and intended change with PM.
- [ ] Obtain the approved layout, copy, interaction behaviour, and final asset.
- [ ] After user approval, add the asset and implement only the agreed screen changes.
- [ ] Verify transparent-area rendering, image sizing/cropping, mobile layout, alternative text, and existing navigation.

## Done when

The agreed Anchovy Bay screen uses the approved asset in the approved layout, with any confirmed copy and interactions. Final acceptance details depend on PM clarification.
