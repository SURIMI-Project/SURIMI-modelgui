# 0018 — CSS design tokens and project-owned React Aria controls

**Status:** Accepted by the user, 2026-11-06.  
**Scope:** Frontend styling/component architecture. Backend/protocol/deployment behaviour is unchanged.

## Decision

Replace Mantine with `react-aria-components` and project-owned controls under `components/ui/`. Separate palette/scales (`styles/design-system/`) from semantic theme values (`styles/themes/`) and control styles (`styles/aria/`). Use CSS Modules with the layer order `reset, tokens, base, aria, components`. Components consume semantic tokens. Presentational compositions receive display-ready values; existing feature adapters and server-state hooks retain business/data responsibilities.

Implement **light only** for this increment, declared on the document root before paint. No dark tokens, switcher or theme preference persistence is introduced. `styles2` remains the user's unimported reference material; it is not a second active theme system.

Preview actual shared controls and report compositions at the authenticated `/design-system` route, with Theme/UI/Presentational tabs and static visual examples rather than a props configurator. Login consumes the same controls. Preserve React Aria render-prop and accessibility contracts using `composeRenderProps`; use labels, descriptions, errors and standard selection behaviours.

## Why

User-selected architecture provides accessible interaction primitives with full SURIMI control over appearance. Keeping Mantine would retain a conflicting provider/theme/styling mechanism. Native controls alone would require implementing and maintaining more complex accessible selection/dialog behaviours. No new chart/map library is required: Chart.js and MapLibre remain.

## Migration and consequences

Remove Mantine's provider, resolver, custom component styles and three packages after migrating every consumer. Existing layout-only wrappers become semantic HTML/CSS, searchable selects become shared ComboBoxes, and popover help becomes keyboard-accessible dialogs. A documented semantic alias file preserves existing screen token names while new controls use the canonical contract. Existing scientific/map compositions can be refined incrementally; this change does not claim a complete visual redesign of every screen.

The warm red/orange/pink palette is an initial application proposal informed by SURIMI branding, not a certified brand manual. Contrast, keyboard operation, responsive layout and existing authentication contracts must remain verifiable.
