# T04 — Anchovy bay Intro Screen

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

## Questions for PM

1. Does “Intro Screen” mean `/scenario/anchovy-bay`, the home-page case card, or a new screen?
2. Should this replace the existing illustration, serve as a background, or be part of a full redesign? Is there a layout reference?
3. Should it be static or interactive/animated? What should appear behind the transparent water area?
4. Are there changes to the title, description, buttons, or navigation? If so, provide the approved copy and behaviour.
5. Is this the final approved asset?

Suggested message:

> Should the supplied bay illustration replace the current illustration on `/scenario/anchovy-bay`, or are you requesting a redesigned screen? Please confirm placement, text changes, and whether the illustration should be static or interactive.

## Existing project locations

Paths below are relative to the repository root.

| Area | Location |
| --- | --- |
| Introduction page | `src/pages/ScenarioWorldPage/ScenarioWorldPage.tsx` |
| Anchovy Bay page configuration/copy | `src/constants/scenarioWorldConfig.tsx` |
| Anchovy Bay feature | `src/features/InformationalScenarios/anchovyBay/AnchovyBayFeature.tsx` |
| Current illustration component | `src/features/InformationalScenarios/anchovyBay/components/AnchovyBayPlaceholderCard/AnchovyBayPlaceholderCard.tsx` |
| Current illustration asset | `public/useCasesInfo/info_anchovy_bay.webp` |

## Tasks — not started

- [ ] Confirm the target screen and intended change with PM.
- [ ] Obtain the approved layout, copy, interaction behaviour, and final asset.
- [ ] After user approval, add the asset and implement only the agreed screen changes.
- [ ] Verify transparent-area rendering, image sizing/cropping, mobile layout, alternative text, and existing navigation.

## Done when

The agreed Anchovy Bay screen uses the approved asset in the approved layout, with any confirmed copy and interactions. Final acceptance details depend on PM clarification.
