# Frontend design-system changelog

## 2026-11-16 — Dark login composition and corrected control surfaces

- Redesigned AuthLayout as a viewport-contained navy/teal sign-in page with a compact white logo tile, clear project copy and dark form card. Smaller screens keep the form in an internal scroll area.
- Replaced the separated input border/focus outline with a single inset focus indicator; invalid focused fields use the error color. Keyboard focus remains visible.
- Added semantic white surfaces/red ink for primary outlined buttons and modal/sheet close controls in the sole theme file. Removed setup/runs overrides that forced those controls dark; disabled controls retain their disabled treatment.
- Login, SSO, return paths, error handling and pending states are unchanged.

**Verified:** production build, all 26 network tests, focused lint and structural checks for white control surfaces/single focus indicator pass. No browser screenshot, keyboard or autofill verification in this increment.

## 2026-11-16 — One dark theme, one active style tree

**User requested:** remove the obsolete style tree, retain the active React Aria/design-system structure and keep exactly one file under themes.

- Consolidated semantic dark values and five required compatibility names into `styles/themes/theme.css`. Removed the light theme, alias file and marine-surface CSS module. The single root theme now reaches portal dropdowns without per-select theme props.
- Removed the empty reference-style directory and unused global utility stylesheet. Moved the font import into the design-system globals and removed the redundant entry stylesheet/imports.
- Preserved explicit white logo/avatar and map coverage-strip roles. Improved outlined-control ink contrast on dark surfaces; retained shared scales, React Aria styles, and prototype text contrast.
- Recorded the theme-scope update in ADR 0019; no backend, dependency, authentication or simulation behavior changes.

**Verified:** build and all 26 network tests pass; one theme file remains, no old theme imports remain, and changed TypeScript files pass focused lint. No new browser verification of final dark surfaces/contrast; full-app lint debt remains tracked separately.

## 2026-11-16 — Scoped dark marine surfaces and reference-style cleanup

- Added theme-owned dark marine surfaces for case previews, setup forms, controls and portal dropdowns; preserved the light foundation and actual design-system controls.
- Case/model sheets and illustrated detail panels share marine borders, readable text and equal-width actions. Removed the unused reference stylesheet tree, as authorized by the user cleanup request.
- Pages fit the viewport with internal scrolling for long content. The case map batches canvas resizes and defers camera reframing to avoid repeated resets while dragging the window.

**Verified:** production build and 26 network tests pass. Lint retains 16 existing errors/five warnings outside the changed map/setup components. No new browser checks; see the [case-study map entry](../case-study-map/CHANGELOG.md) for scope and limitations.

## 2026-11-06 — Scoped sea-background identities

- `styles/design-system/colors.css`: eight supplied Northwestern/Aegean raw palette values, defined once.
- `styles/themes/light.css`: reusable background/deep/secondary/accent and on-sea semantic roles. Existing global light/brand tokens remain unchanged.
- Map consumers alias the semantic roles locally; neutral surfaces and typography are preserved. No new dependencies, gradients or UI components. See [case-study map verification](../case-study-map/CHANGELOG.md).

## 2026-11-06 — UseCaseSelector control

Added the real compact glass UseCaseSelector composition to the Presentational components tab and the landing page. Replaced the former CaseStudyOption cards, introduced shared glass-surface tokens and removed number/category labels from the selector. The control accepts display-ready options and selection state; it has no fetching/domain logic or preview-only copy. See [case-study map verification](../case-study-map/CHANGELOG.md).

## 2026-11-06 — Light case-selection consumer

The case-selection page now consumes the shared controls and semantic light theme, including reusable `CaseStudyOption` and the extracted SessionMenu styles. Added sea/land/reflection tokens for the decorative map water. Brand controls remain red/orange/pink; no dark theme is introduced. See [map verification](../case-study-map/CHANGELOG.md). The supplied `styles2` reference remains untouched.

## 2026-11-06 — Light foundations, component preview and Mantine removal

**Confirmed scope:** light theme only; no dark work or props playground. Supplied `styles2` files remain untouched and unimported as user reference material.

- Added semantic light tokens, raw palette/scales, explicit cascade layers and CSS Module control styles under `styles/`. Existing screen tokens are retained through documented aliases, without the Mantine resolver. Light is set on `<html>` before paint. Sora remains the shared typeface; the warm palette is subject to visual review rather than claimed as a formal brand specification.
- Added project-owned React Aria Button (four variants), Input/field, Select, searchable ComboBox, Popover, Tabs, RadioGroup and Table. Static tags and surfaces use shared Tag/Card components. Render-prop class names are composed; labels, descriptions, errors, disabled/pending states and keyboard behaviour remain with React Aria.
- Added protected `/design-system` with Theme, UI components and Presentational components tabs. Theme shows palette/type/spacing/radii/shadows; UI examples show actual controls and visual states. The presentational feature adapter reuses the report's real map, chart cards, spider diagram, year control, metrics and selectors against the existing fixed dataset. It does not create simulations or call scientific REST endpoints.
- Login composes shared AuthLayout/Card/Input/Button; SSO uses the shared outlined button. Transport, cookie/CSRF/session/return-path/error handling is unchanged. Auth descriptive copy and preview fixtures live in `mock-data/designSystem.ts`.
- Extracted shared ChartCard composition into `components/presentational/`, used by production trend panels. Chart.js reads resolved light semantic colours for canvas text/grid. Updated selected report surfaces/metric/year controls to light semantics; exact scientific series colours and map palettes are unchanged.
- Migrated all Mantine consumers: layout wrappers to HTML/CSS, selects to React Aria, input table to selectable React Aria table, informational popovers/chart help to accessible dialogs, tags/buttons to owned components. Chart help is now explicitly opened by click/keyboard rather than mouse hover. Removed Mantine provider, theme resolver/baseTheme, custom Mantine styles and all three packages. Chart.js and MapLibre remain.
- Cleanup is restricted to migrated files. Existing unrelated presentation styles and the preserved cinematic/map implementations are retained. This is a component foundation and visual review surface, not a claim that every historical page now follows the final design.

**Verified:** production build passes; 23 focused network tests pass. Full lint remains at the known 18 errors/5 warnings, with no new findings. `npm ls` reports React Aria Components 1.22.1 and no Mantine packages; source/lockfile contain no Mantine imports or stale selectors. Diff whitespace and LF checks pass.

**Browser verified:** isolated Chrome desktop/mobile, protected preview redirect, local-login payload and return destination, pending fields/button and API error display, SSO navigation to the unchanged backend entry, keyboard tabs, Select selection, searchable report ComboBox, actual report route/legend dialog, harvest-control select/table row selection, metric keyboard selection, public CMSY chart rendering/help, and no uncaught JavaScript errors. Existing map/experiment work was preserved.

**Verification limits:** API auth/catalogue responses were controlled in browser checks; no new live password/Keycloak exchange was exercised. Existing network tests verify transport contracts. Report map tiles still depend on OpenStreetMap/network availability. Final palette, screen-by-screen refinement and certified brand values remain for user review. No backend/protocol/CI/deployment files changed; no commit created.

**Deploy:** `npm ci`, rebuild frontend. No environment variable or database migration.
