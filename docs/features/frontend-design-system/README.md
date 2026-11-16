# Frontend design system

**Current scope, user authorized 2026-11-16:** one dark application theme under `styles/themes/theme.css`, with the active React Aria/design-system style tree retained. This supersedes the original light-only/reference-tree scope of 2026-11-06; see [ADR 0019](../../decisions/0019-single-dark-application-theme.md). Preserve backend and authentication contracts.

| Decision | Why | Source |
| --- | --- | --- |
| One dark application theme | One source for base, controls, modals and portal dropdowns; no alternate theme or switch | User refinement, 2026-11-16; [ADR 0019](../../decisions/0019-single-dark-application-theme.md) |
| CSS palette/scales, semantic dark tokens, CSS Modules and cascade layers | Central ownership and predictable overrides | [ADR 0018](../../decisions/0018-frontend-css-tokens-and-react-aria.md) |
| `react-aria-components` behind project-owned controls | Accessible behaviour with SURIMI-owned appearance | User architecture |
| Preview actual shared controls/compositions, no props playground | Changes must reach production | User request |
| Red primary, warm secondary, neutral surfaces | Initial editable SURIMI direction, not a certified branding palette | SURIMI brand article and user |
| Temporary semantic aliases for existing pages | Remove Mantine's token resolver while preserving existing scientific/map layouts | This feature |

## Structure and scope

`styles/design-system/` holds palette, spacing, typography, radii, borders, shadows and motion. `styles/themes/theme.css` is the only theme file and implements the dark semantic tokens. `styles/aria/` holds shared control styles. `components/ui/` owns React Aria wrappers and simple reusable building blocks; `components/presentational/` owns domain-independent visual compositions with display-ready props. Parents own layout; feature hooks/adapters retain data and domain rules. The document root applies the single dark theme before paint; modal, sheet and portal controls inherit it. White logo/avatar surfaces, sea-card coverage strips, primary outlined buttons and modal close controls use explicit semantic roles. There is no theme switcher or theme-specific CSS module.

`/design-system` sits behind the existing session guard and has Theme, UI components and Presentational components tabs. Static examples show relevant variants and validation states; controls remain functional and keyboard accessible. Preview datasets/descriptive content live under `mock-data/`. Report previews reuse actual existing map/chart/indicator components through existing feature adapters, without scientific REST requests or simulation creation. The existing report map retains its OpenStreetMap tile requests.

Login uses a navy/teal composition and dark form card, with single inset input-focus indicators. It retains local/SSO services, errors, session restoration and required-password routing. Its fields, buttons and surface use the shared foundation. Mantine layout wrappers are replaced with semantic HTML and CSS layouts, interactive controls with React Aria; charts already use Chart.js. Remove Mantine provider/theme files/packages after the last consumer migrates. The adopted implementation lives in `styles/`. The unimported reference tree, obsolete global utility stylesheet and separate font entry stylesheet were removed under the user-authorized 2026-11-16 cleanup. Font loading and base rules now live in `styles/design-system/globals.css`. Five still-consumed compatibility names are kept in the single theme file to preserve prototype/chart text contrast. Legacy styles outside the migrated consumers remain for later screen refinement; new/migrated foundation styles use the declared layers.

## Verification

Build, lint compared with known baseline, focused network tests, browser review of login errors/pending/SSO entry, keyboard tabs/selects/popovers/table, protected preview access, report and input-flow navigation. Backend remains unchanged. Record actual results and remaining limits in the changelog.

Brand reference: https://www.surimi-project.eu/crafting-the-surimi-brand-a-strategic-approach-to-visual-identity-and-inclusivity/ . Official source describes orange/red/pink; final application swatches remain subject to user visual review.

## Composition

```mermaid
flowchart LR
    Palette[Palette and shared scales] --> Theme[Light semantic tokens]
    Theme --> Controls[Shared UI controls]
    Controls --> Login[Login composition]
    Controls --> Report[Report compositions]
    Controls --> Preview[Design-system preview]
    Report --> Preview
    Fixtures[Existing fixed report and adapters] --> Report
```

Read from source: no new REST endpoint, session mechanism, backend table or cross-process flow is introduced. Existing map tile requests remain owned by the map feature. Canonical values live in CSS; `chartTheme.ts` resolves them only where canvas rendering requires colour strings. Theme persistence is intentionally absent because this increment has one supported light theme.

## Review and remaining work

Verified implementation and test details are in [CHANGELOG.md](CHANGELOG.md). Review `/login` and `/design-system`, then refine the palette and each real component. Legacy aliases are a migration boundary, not a second palette; remove them as their remaining consumers are converted. Existing scientific series colours, case-map atmosphere and historical screen-specific styling are not automatically recoloured by every shared-token change.

## Sea background tokens — 2026-11-06

User-supplied Northwestern and Aegean palettes extend the existing raw palette and light semantic roles (`--color-sea-nw-*`, `--color-sea-aegean-*`, `--color-sea-on-background`). The selected case-map scene aliases these roles to its existing water tokens. Northwestern uses restrained deep marine blue; Aegean uses brighter azure with turquoise in its secondary/reflection colours. The overview, educational Bay, brand actions, light card surfaces and typography retain their existing styling. No dark theme, new dependency, component, gradient or layout change. GPU water reads the same scoped CSS tokens as the static MapLibre background. The dedicated map feature documents rendering/verification.
