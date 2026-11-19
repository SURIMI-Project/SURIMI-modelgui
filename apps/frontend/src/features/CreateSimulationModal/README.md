# Simulation creation

- `CreateSimulationModal.tsx`: shared dark modal shell; blocks closing during submission.
- `cases/`: one entry component per case, passing its backend identifier and display label to `ScenarioCreateSimulationModal.tsx`.
- `ScenarioCreateSimulationModal.tsx` owns options loading and the create mutation, scoped to the selected case.
- `flows/ScenarioSimulationFlow.tsx` owns shared navigation, validation and submission. Payloads and saved-configuration queries use `options.scenario_name`.
- `flows/northwestern/` currently houses the reusable HCR, duration, climate and review sections and styles; the previous Northwestern flow entry re-exports the shared flow.
- React Hook Form owns the draft; Zod validates against the options used to open it.
- Services and server-state hooks own HTTP requests and cache updates.
- `scenarioWorldConfig.creationEnabled` controls setup availability on details and runs pages.
- All three case creation entry points are enabled. Backend scenario availability still controls access.
- Show and allow new rules only for entries with `hcr_eligible: true`. Every case starts on the HCR step. When no eligible entries exist, replace the selector with an explanatory message, omit the graph/table and allow Next with an empty rule list. Always retain the climate step; if the backend supplies no choices, show an explanatory message and allow Next without a selection.
- Live local options checked on 2026-11-18: Northwestern has 6 eligible HCR entries and 3 RCP choices; Aegean has no eligible HCR entries and no climate choices; Anchovy Bay has no eligible HCR entries but has 3 RCP choices. Both newly enabled cases have 2013–2050 date limits. Aegean and Anchovy therefore retain an explanatory HCR first step without editable rules. No experiment was submitted during this verification.
- Aegean remains based on the current species contract. Functional-group-targeted HCR creation is not implemented or inferred.

## Northwestern inputs

- Simulation name: collected only in the final review step, required and up to 24 characters, with a constrained-width React Aria field and character counter. Step two contains duration only; step three contains climate selection or its unavailable-options message; the final step collects the name and review.
- Simulation horizon: six shared `YearlyDurationCard` radio cards in a three-column grid, using supported year choices derived from the case date limits calculate UTC `end_date_time` from the fixed start in `experiment-options`. Only durations within the maximum end are shown; cases supporting fewer than six whole years show fewer choices. Calendar-year addition preserves the time and clamps a leap-day anniversary to the end of February. The review shows both duration and end date.
- Run type: single simulation only for now; submission always sends `is_mse_run: false`.
- Climate: a separate climate step includes shared `IpccScenarioCard` radios with descriptive content from `mock-data/content/climateScenarios.ts`. Only choices returned by `experiment-options` appear; original backend identifiers are submitted unchanged. The climate step remains visible if no choices exist, explains that backend-supported options are needed, and allows continuing without a selection.
- RCP and SSP identifiers have separate descriptions. SSP headings, categories, descriptions and warming ranges reproduce the PM-approved screenshot verbatim. Its long-horizon wording is presentation copy; it does not override backend climate requirements for shorter runs. Unknown identifiers retain the backend label with neutral copy; no inferred pathway mapping or duration-based climate default is applied.
- HCR opens first. With eligible entries, Next requires a configured rule; Continue without configuration clears rules and advances. With no eligible entries, Next advances directly without configuration. Previous returns to the same empty state.
- Existing saved configurations remain available through the Rule source selector when present.
- Manual rule: eligible species/life stage from scenario options, biomass limit/base displayed and edited in tonnes, positive fishing mortality per year.
- Form state and API payloads retain kg (`biomass_limit_kg`, `biomass_base_kg`) and `f_max`. Inputs and graph drag coordinates convert at the display boundary.
- The first eligible species is selected and its opening values are loaded on every fresh open. Initial biomass has unconfirmed units and is reference data only.
- Local Vite development loads a matching preset from `mock-data/defaultConfigureRules.ts` only when that species is selected.
- Development presets are never used in production and can be disabled with `VITE_MOCK_HCR_DEFAULTS=false`. The extra development/helper messages are omitted from the editor.
- The first screen uses the revised PM explanation with the TAC formula. The selector sits alongside the heading with an accessible hidden label and no surrounding card. The explanation uses two short columns below, stacking on small screens.
- Initial loading and errors retain the introduction, reserved graph/table space and disabled forward actions.
- The graph sits above the table inside the scrolling body, with footer actions kept visible.
- Edit the active row directly in the table; there is no separate numeric-input form.
- Entries without a development preset or saved rule start empty; controller references never become thresholds.
- Curve handles and numeric inputs update the same form values. The zero lower fishing mortality remains implicit.
- Table columns: species/life stage, biomass limit (tonnes), biomass base (tonnes), fishing mortality (per year). A reset icon at the right of each configured row restores its opening preset or copied saved values without deselecting the species. Without a preset, the opening values are blank.
- Protocol input bounds: `0 < biomass_limit_kg <= 3,300,000,000,000` and `0 < biomass_base_kg <= 3,300,000,000,000` and `0 < f_max <= 100`. Biomass is treated as kg at the API boundary and displayed as tonnes.
- Limit and base are independent. Base at or below the limit renders an all-or-nothing switch at the limit; both control values remain editable. The editor explains this behaviour without changing the TAC callout design.
- Visual ranges are separate from validation: they initially include the current values (at least 10,000 tonnes and 5/year), stay stable during dragging, and expand when larger valid values are entered in the table. Dummy presets remain unchanged pending scientific defaults.
- Hover along any red-line segment to see the annual TAC formula and result in tonnes/year. The callout is offset with a pointer and hidden during dragging.
- Saved configuration summaries come from `experiment-options`; hide the saved mode when the list is empty.
- Full saved rules are fetched only after selection and shown in the graph/table.
- Edit a copy loads saved thresholds into the draft and submits inline rules; it never changes the saved configuration.
- Copied rules absent from the current eligible entries remain visible but block submission; choose another configuration or start a new one.
- No automatic SSP/RCP mapping or fabricated species. Climate choices remain exactly those returned by `experiment-options`; development thresholds use only eligible entries returned in the scenario options.

## Step transitions

- Forward/back navigation uses a short directional slide and fade with the existing Framer Motion dependency.
- Form components stay mounted where needed to retain HCR selection, reset baselines and draft values. Footer actions stay fixed.
- Navigation is locked while transitioning; focus moves to the new heading (or review name input) after the transition. Reduced-motion preferences disable the movement.

## Submission

- Previous preserves the draft. Closing and reopening starts a new draft.
- Forward actions validate the current step live and remain disabled until complete. Shared React Aria tooltips explain missing requirements on hover and keyboard focus; disabled native buttons use a focusable wrapper. The review name is marked required and does not show ordinary client-validation errors.
- Server failures retain inputs and remain visible; submitting disables edits and closing.
- Success invalidates experiment lists and notifies the opener.
- The service revalidates case capabilities before sending the payload.
- Saving or managing HCR configurations is outside this flow.

## Backend compatibility

- `hcr_eligible` filtering is enforced in the UI, development defaults, experiment payload validation and configuration-save mutations.
- Saved rules must still be eligible and belong to the current eligible scenario entries. Invalid copied rules are preserved for inspection and block submission.
- Biomass limit/base ordering remains independent; restoring eligibility filtering does not revert support for the all-or-nothing rule.
