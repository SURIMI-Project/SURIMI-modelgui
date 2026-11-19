# Codex frontend instructions

These instructions apply to Codex work in `apps/frontend/`. This is the
frontend instruction file for Codex; do not use `CLAUDE.md` as the frontend
workflow or documentation policy.

## Writing style

- Apply these rules to all Markdown files, documentation, work logs and user
  responses, including progress updates.
- Use a stoic tone: plain, direct and factual.
- Prefer short bullet points with concrete actions, results or decisions.
- Keep explanations brief. No essays, lengthy analysis, filler or repetition.
- Include only details needed to understand the change or make a decision.

## Frontend boundary

- Work only inside `apps/frontend/`.
- Do not create, edit, move or delete files outside this directory. This
  includes repository-level documentation, manifests, lockfiles, backend code,
  protocol files, deployment configuration and CI configuration.
- If a task needs files, documentation or changes outside the frontend app,
  explain exactly what is needed and why, then wait for the user's explicit
  decision before proceeding outside this boundary.
- Use frontend-local documentation. Do not maintain repository-level feature
  documents or changelogs as part of frontend work.
- Check command side effects: a command launched inside the frontend can still
  update a root lockfile or generate files outside the app. Do not run such a
  command without the user's authorization for those changes.
- Preserve existing user changes. Do not commit unless the user requests it.

## Frontend conventions

- Follow the existing React, strict TypeScript, naming and folder conventions.
  Inspect nearby implementations before introducing a new pattern.
- Keep page composition in `src/pages/`, feature behaviour in `src/features/`,
  and reusable components in `src/components/`; colocate component styles in
  CSS modules as the app does already.
- Reuse the existing React Aria components and design system. Use the current
  dark theme and shared tokens for colours, spacing, typography and states;
  do not introduce another theme or parallel styling system.
- Preserve accessibility, responsive behaviour and reduced-motion support.
- Keep the data flow: component -> `serverState` hook -> domain service ->
  shared `network/request.ts`. Do not add ad hoc HTTP calls to components.
- Define API schemas beside their services with Zod; infer TypeScript types
  from those schemas and validate outgoing payloads and incoming responses.
  Do not invent API contracts or silently replace failures with mock data.
- Use TanStack Query for server state, user-scoped query keys for protected
  data, and query cancellation signals. Keep unsaved form drafts and local
  selections in React state rather than duplicating server data.
- Reuse the existing cookie/CSRF transport and session handling. Never send
  API credentials through that transport to external signed download URLs.
- Keep changes within the requested scope. Preparing a service or hook does
  not authorize integrating it into pages.

## CMSY presentation exception

- `/test`, `/cmsy-input` and `/cmsy-output` live entirely under `src/pages/cmsy/`.
- Preserve their original `dev` presentation, including the light theme and
  `/test` scroll animation. Do not apply the main application's dark design.
- Keep their components, styles, data, hooks and assets inside that folder.
- Do not import main-app UI components or theme tokens into these pages.
- Scope their styles and popovers so they cannot change the main application.

## Work logs

- Work logs live only in `apps/frontend/docs/work-logs/`.
- Create or update a work log only when the user explicitly asks for one.
  Completing a task, changing code or preparing a commit is not such a request.
- When requested, use the current date in the user's timezone
  (`Europe/Athens` unless the user specifies another) and the exact filename
  `YYYY-MM-DD.md` inside that folder.
- If that day's file exists, update it and preserve its existing entries.
  Otherwise create that day's file. Do not create multiple logs for one day.
- Record the work performed, relevant frontend paths, verification actually
  performed, and material decisions or remaining work. Do not claim checks
  that were not run.
- Do not create a work-log entry merely because this instruction file changed.

## Verification

- Do not write, generate or modify tests. Do not add testing dependencies or
  test scaffolding. This rule takes precedence over older frontend documents
  that recommend adding regression tests.
- Do not use headless Chrome, Chromium, Playwright, Puppeteer or browser
  automation for testing, screenshots or visual inspection.
- Use appropriately scoped TypeScript, lint and build checks when useful,
  while respecting the frontend filesystem boundary.
- State which checks were actually performed and any material limits.
