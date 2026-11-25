# Simulation creation

- `CreateSimulationModal.tsx`: shared dark modal shell; blocks closing during submission.
- `cases/`: one entry component per case, passing its backend identifier and display label to `ScenarioCreateSimulationModal.tsx`.
- `ScenarioCreateSimulationModal.tsx` owns options loading and the create mutation, scoped to the selected case.
- `flows/ScenarioSimulationFlow.tsx` owns shared navigation, validation and submission. Payloads and saved-configuration queries use `options.scenario_name`.
- `flows/northwestern/` currently houses the reusable HCR, duration, climate and review sections and styles; the previous Northwestern flow entry re-exports the shared flow.
- React Hook Form owns the draft; Zod validates against the options used to open it.
- Services and server-state hooks own HTTP requests and cache updates.
- `scenarioWorldConfig.creationEnabled` controls setup availability on details and runs pages.
- Setup availability is controlled per case in `scenarioWorldConfig`; backend scenario availability still controls access.
- Show and allow new rules only for entries with `hcr_eligible: true`. Every case starts on the HCR step. When no eligible entries exist, replace the selector with an explanatory message, omit the editor and allow Next with an empty rule list. Always retain the climate step; if the backend supplies no choices, show an explanatory message and allow Next without a selection.
- Live local options checked on 2026-11-18: Northwestern has 6 eligible HCR entries and 3 RCP choices; Aegean has no eligible HCR entries and no climate choices; Anchovy Bay has no eligible HCR entries but has 3 RCP choices. Both newly enabled cases have 2013–2050 date limits. Aegean and Anchovy therefore retain an explanatory HCR first step without editable rules. No experiment was submitted during this verification.
- Aegean remains based on the current species contract. Functional-group-targeted HCR creation is not implemented or inferred.

## Northwestern inputs

- Simulation name: collected only in the final review step, required and up to 24 characters, with a constrained-width React Aria field and character counter. Step two contains duration only; step three contains climate selection or its unavailable-options message; the final step collects the name and review.
- Simulation horizon: 5, 10, 30 and 50 years in a two-column grid, with descriptions and calculated end dates. Calendar-year addition uses the model start from `experiment-options` and clamps leap-day anniversaries to February’s end. Choices beyond the API maximum remain visible and disabled with a reason. Submission uses the selected end date; there is no one-year override. Climate selection remains a separate step for every duration.
- Run type: single simulation only for now; submission always sends `is_mse_run: false`.
- Climate: a separate climate step includes shared `IpccScenarioCard` radios with descriptive content from `mock-data/content/climateScenarios.ts`. Only choices returned by `experiment-options` appear; original backend identifiers are submitted unchanged. The climate step remains visible if no choices exist, explains that backend-supported options are needed, and allows continuing without a selection.
- RCP and SSP identifiers have separate descriptions. SSP headings, categories, descriptions and warming ranges reproduce the PM-approved screenshot verbatim. Its long-horizon wording is presentation copy; it does not override backend climate requirements for shorter runs. Unknown identifiers retain the backend label with neutral copy; no inferred pathway mapping or duration-based climate default is applied.
- HCR opens first. With eligible entries, Next requires a configured rule; Continue without configuration clears rules and advances. With no eligible entries, Next advances directly without configuration. Previous returns to the same empty state.
- Existing saved configurations remain available through the Rule source selector when present.
- Manual rule: eligible species/life stage from scenario options, biomass limit/base displayed and edited in tonnes, positive fishing mortality per year.
- Form state and API payloads retain kg (`biomass_limit_kg`, `biomass_base_kg`) and `f_max`. Inputs and graph drag coordinates convert at the display boundary.
- Defaults come from `experiment-options` when supplied, otherwise from the protected `initial-hcr-data` endpoint. Match species and life stage; exclude length/age-specific entries. Initial biomass and mortality are references, never inferred rule thresholds.
- All complete, valid defaults for eligible entries start in the form. The API sends exactly the supplied rules; an empty list means no HCRs. Unchanged defaults therefore remain in the payload even though the changed-species list hides them.
- The searchable Species dropdown keeps life stages in option labels to distinguish entries. Browsing species does not create changes.
- The active species has one graph and three keyboard inputs. Typed decimal text is preserved, while form/API state retains numeric kg and mortality values. Only active-species fields are displayed.
- The wider species column is one rounded glass card with uniform padding and no separate right-hand divider. Modified rows align with the dropdown edges; scrollbar space is reserved only when needed. The Modified species count shows only the number, and the list scrolls independently. The main species search includes both unchanged and modified species. Selection uses background highlighting without a red side stripe.
- The shared Text component isolates ordinary text from surrounding React Aria dialog slots. Only dropdown option text binds to label/description slots; this prevents a crash when the first modified row appears.
- The modified list has a compact visual default-rules empty state. The left panel uses subtle glass styling with a reduced-transparency fallback, and reset actions use × icons. The TAC card shows only the formula beside the explanation, with a divider.
- Species selection uses one React Aria ComboBox with a magnifier and click/focus opening. It searches every eligible species, including those already modified. The modified list has no separate filter.
- Modified species use equal-height, two-line rows: a truncated name followed by code - life stage. The shared Text component handles ellipsis, preserving full accessible labels without hover tooltips. Dropdown options use the same text layout and consistent height. A larger × restores defaults from the same row. Selected rows use a readable teal surface instead of a red/grey blend. Removing changes restores the controller defaults and removes the row from the list. If that species is selected, it stays selected in the chooser and its default curve/inputs remain visible. Incomplete defaults are previews; removing such an entry removes its draft rule.
- Step one is titled Harvest control input, without a subtitle or expandable help. The title, species chooser and modified list share the left glass card. The explanation and TAC card begin at the top of the right column, directly above the graph. The selected species, code/stage, initial references and Modified status share one row; An × icon restores defaults. The chart fills the remaining height above the numeric inputs. The modal body does not scroll on this step; bounded internal lists, text and parameters can scroll on small screens. Dedicated HCR semantic tokens improve contrast without changing other screens.
- Curve dragging and keyboard editing share the same form values. Returning values to their defaults removes the changed item automatically, ignoring kg/tonne floating-point conversion noise.
- Initial loading and errors retain the introduction, reserved graph space and disabled forward actions. The editable form mounts after its defaults are ready and preserves drafts across background refetches.
- Protocol input bounds: `0 < biomass_limit_kg <= 3,300,000,000,000` and `0 < biomass_base_kg <= 3,300,000,000,000` and `0 < f_max <= 100`. Biomass is treated as kg at the API boundary and displayed as tonnes.
- Limit and base are independent. Base at or below the limit renders an all-or-nothing switch at the limit; both control values remain editable. The editor explains this behaviour without changing the TAC callout design.
- Visual ranges fit the active rule’s values, remain stable while dragging or reducing values, and expand when larger valid values are entered.
- Hover along any red-line segment to see the annual TAC formula and result in tonnes/year. The callout is offset with a pointer and hidden during dragging.
- Saved configuration summaries come from `experiment-options`; hide the saved mode when the list is empty.
- Full saved rules are fetched only after configuration selection. The species dropdown selects a read-only graph and values; Edit a copy enables changes.
- Edit a copy loads saved thresholds into the draft and submits inline rules; it never changes the saved configuration.
- Copied rules absent from the current eligible entries remain visible but block submission; choose another configuration or start a new one.
- No automatic SSP/RCP mapping or fabricated species. Climate choices remain exactly those returned by `experiment-options`; thresholds come from backend-provided defaults and user changes.

## Step transitions

- Forward/back navigation uses a short directional slide and fade with the existing Framer Motion dependency.
- Form components stay mounted where needed to retain HCR selection, reset baselines and draft values. Footer actions stay fixed.
- Navigation is locked while transitioning; focus moves to the new heading (or review name input) after the transition. Reduced-motion preferences disable the movement.

## Submission

- Previous preserves the draft. Closing and reopening starts a new draft.
- Continue without configuration uses the shared Button at the standard medium size, matching Next and input heights.
- Forward actions validate the current step live and remain disabled until complete. Shared React Aria tooltips explain missing requirements on hover and keyboard focus; disabled native buttons use a focusable wrapper. The review name is marked required and does not show ordinary client-validation errors.
- Server failures retain inputs and remain visible; submitting disables edits and closing.
- Success invalidates experiment lists and notifies the opener.
- The service revalidates case capabilities before sending the payload.
- Saving or managing HCR configurations is outside this flow.

## Backend compatibility

- `hcr_eligible` filtering is enforced in the UI, controller defaults, experiment payload validation and configuration-save mutations.
- Saved rules must still be eligible and belong to the current eligible scenario entries. Invalid copied rules are preserved for inspection and block submission.
- Biomass limit/base ordering remains independent; restoring eligibility filtering does not revert support for the all-or-nothing rule.
