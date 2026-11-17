# Simulation creation

- `CreateSimulationModal.tsx`: shared dark modal shell; blocks closing during submission.
- `cases/`: one entry component per case. Each owns its options query and creation lifecycle.
- `flows/northwestern/`: independent HCR, settings and review screens with local styles.
- React Hook Form owns the draft; Zod validates against the options used to open it.
- Services and server-state hooks own HTTP requests and cache updates.
- `scenarioWorldConfig.creationEnabled` controls setup availability on details and runs pages.
- Northwestern Mediterranean is enabled. Aegean Sea and Anchovy Bay remain disabled.

## Northwestern inputs

- Simulation name: required, up to 200 characters.
- End date/time: UTC, after the case start and within its maximum end.
- Run type: single simulation or MSE.
- Climate: only choices returned by `experiment-options`; required when supported.
- HCR mode: none, manually configured rules, or an existing saved configuration.
- Manual rule: eligible species/life stage, biomass limit/base in kg, positive F max.
- Production rules start empty. Initial biomass has unconfirmed units and is reference data only.
- Local Vite development loads `mock-data/defaultConfigureRules.ts` for matching eligible Northwestern entries.
- Mock values are labeled, are never used in production, and can be disabled with `VITE_MOCK_HCR_DEFAULTS=false`.
- The first screen preserves the PM explanation and shares one graph, species selector and synchronized rule table.
- Desktop uses a wider modal with the graph beside the table; small screens retain internal scrolling.
- Edit the active row directly in the table; there is no separate numeric-input form.
- Entries without a development preset or saved rule start empty; controller references never become thresholds.
- Curve handles and numeric inputs update the same form values. F min remains zero.
- Saved configuration summaries come from `experiment-options`; hide the saved mode when the list is empty.
- Full saved rules are fetched only after selection and shown in the graph/table.
- Edit a copy loads saved thresholds into the draft and submits inline rules; it never changes the saved configuration.
- Ineligible copied rules stay visible so the user can remove them before submission.
- No fixed duration presets, automatic SSP choice or fabricated species; development thresholds use only backend-eligible entries.

## Submission

- Previous preserves the draft. Closing and reopening starts a new draft.
- Errors retain inputs and remain visible; submitting disables edits and closing.
- Success invalidates experiment lists and notifies the opener.
- The service revalidates case capabilities before sending the payload.
- Saving or managing HCR configurations is outside this flow.
