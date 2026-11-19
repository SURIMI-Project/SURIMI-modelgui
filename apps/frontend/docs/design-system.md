# Design system

- Showcase: `/design-system`.
- Theme: `src/styles/themes/theme.css`.
- Shared scales: `src/styles/design-system/`.
- Layout and control dimensions: `layout.css`.
- React Aria control styles: `src/styles/aria/`.

## Shared components

- `ui/Button`: primary, white outlined and ghost actions.
- `ui/Button/ButtonLink`: navigation with the same button styles.
- `ui/Tag`: shared tones and optional status dot.
- `ui/Card`: solid and glass surfaces.
- `ui/Input`, `Select`, `ComboBox`, `RadioGroup`: shared form controls.
- `ui/Table`, `Tabs`, `Popover`, `Modal`, `Sheet`: shared interaction primitives.
- `presentational/CaseStudyCard`: sea cards and Anchovy Bay card.
- `presentational/ChartCard`: output trend panels.
- Showcase overlays reuse the case preview, setup modal and models sheet.
- The commented legacy case selector remains archived; it is not showcased.

## Output pages

- `DemoScenarioOutputs` supplies fixture data and local state.
- `ScenarioOutputsView` receives models, callbacks and a back link.
- The view has no fixture imports, route parameters or API calls.
- The future experiment-ID page can supply the same models.
- Chart colours, fonts and spacing resolve from CSS through `chartTheme.ts`.
- Scientific scales, SVG geometry and data calculations remain separate from theme tokens.
- Dashboard content scrolls inside its viewport; the document stays fixed.
- New server-state hooks remain disconnected from the UI.

## Demo routes

- `/scenario-runs?case=aegean-sea`: Scenario 1 and Scenario 2, with comparison selection.
- `/scenario-outputs/aegean-sea?run=1&run=2`: compare the explicit demo pair.
- Each case has its own fixed pair; unknown run IDs show an unavailable state.
- Charts and map controls retain the selected run names.
- Shared `ui/Checkbox` supplies run selection and its showcase examples.
- `/cmsy-input`: original light case/species selection and catch CSV from `dev`.
- `/cmsy-output`: four CMSY sample charts and stock indicators.
- CMSY and `/test` are independent of the main design system.
- Their local React Aria controls, original light layouts, data and assets live in `src/pages/cmsy/`.
- CMSY indicators remain sample data; no model is executed.
- Routes load lazily. API integration remains separate.
