# Backend console — changelog

Every change made for this feature, newest first. Each entry says what changed,
where, how it was checked and what deploying it needs. Design is in
[README.md](README.md).

---

## 2026-11-18 — A biomass base at or below the limit is allowed, with a note

**Status:** built. `node --check app.js` passes. **Not run in a browser or
jsdom** (jsdom is not installed in this checkout).

- `app.js` (`collectRules`): the error "the biomass base must be above the
  biomass limit" (2026-11-16) is replaced by "the biomass base must be above
  0 t"; the API accepts a base at or below the limit since 2026-11-18
  ([harvest control rules](../harvest-control-rules/CHANGELOG.md)).
- `app.js` (`addRuleRow`): under the base input, a note appears while the
  base is at or below the limit: "Base at or below the limit: full fishing
  mortality above the limit, no fishing at or below it."

---

## 2026-11-16 — Clearer message for a biomass base below the limit

**Status:** built. `node --check app.js` passes; the jsdom check of the tab
(16 checks) passes. **Not clicked in a real browser.**

- `app.js` (`collectRules`): "the biomass base must be above the limit, both
  above 0" is split in two messages; the second names both values and what
  they mean, e.g. "HKE adult: the biomass base (2 t) must be above the biomass
  limit (34 t): below the limit no catch is allowed, above the base the full
  fishing mortality applies." (the user typed the two values the other way
  round, 2026-11-16).

---

## 2026-11-16 — End date defaults to one year

**Status:** built. `node --check app.js` passes; the jsdom check of the tab
(now 15 checks) passes, including the end date `2014-01-01` for a contract
starting 2013-01-01 and the cap at a contract maximum less than a year away.
**Not clicked in a real browser.**

- `app.js`: `defaultEndDate()` (`DEFAULT_RUN_YEARS` = 1): the end date starts
  one year after the scenario's start (asked by the user, 2026-11-16, as "the
  start date … default to 1 year"; an experiment always starts at the
  contract's start, so it is the end that is chosen), never past the
  contract's maximum. It was the maximum (2050-01-01 for `northwestern_med`).
  The hint beside it says when the run starts.

---

## 2026-11-16 — HCR species from a dropdown; nothing typed is left out

**Status:** fixed and built. `node --check app.js` passes; every element id
the script uses exists. **Verified** 2026-11-16 by driving the real
`index.html` and `app.js` in jsdom against a fake API (13 checks, script kept
outside the repo): the dropdown lists every contract species with ANE adult
disabled; adding HCR-eligible species, typing their values and submitting
sends exactly those rules (HKE juvenile 100 t → `biomass_limit_kg` 100000);
an incomplete row blocks the submit; Remove returns a species to the
dropdown; loading a configuration replaces the list (in tonnes); Save as new
sends the list; "(none)" empties it. **Not yet clicked in a real browser.**

Reported by the user, 2026-11-16: rules typed for HKE juvenile were not in
the request (`"harvest_control_rules": []`). Cause: the tick-box table sent
only rows whose **Apply** box was ticked, and dropped typed values in other
rows without a word.

- `index.html`, `app.js`: the table of every species with an Apply box is
  replaced by an **Add a species** dropdown (HCR-eligible species selectable,
  with their initial biomass and F; the others greyed, in their own group) and
  the list of added species, each with its three values and **Remove**. Every
  row of the list is sent; a line says how many rules will be sent. The
  submit and save messages name the rules (`describeRules`). Loading a
  configuration fills the list; rules no longer eligible are left out with a
  message, as before.
- `style.css`: the `not-eligible` row style is removed.

---

## 2026-11-16 — Download .nc

**Status:** built. Ruff, format, mypy strict clean; **288 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16. `node --check app.js` passes. **Not clicked in a
browser**; the link it opens was checked from the command line (see the
[experiment-outputs CHANGELOG](../experiment-outputs/CHANGELOG.md)).

- `app.js`, `index.html`: in **My experiments**, a **Download .nc** button for
  each `completed` run. It asks `GET /api/v1/experiments/{id}/outputs/download-url`
  and opens the presigned link, so the browser downloads straight from the
  bucket; a notice gives the file name, its size and until when the link
  works (1 hour by default).

---

## 2026-11-16 — HCR configurations; every contract species

**Status:** built. Ruff, format, mypy strict clean; **286 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16. `node --check app.js` passes; every element id the
script uses exists. **Not opened in a browser.**

- `index.html`, `app.js`, `style.css`: in the New experiment tab a
  **Configuration** picker (load one of yours into the table), a name field,
  **Save** (rename and replace the chosen one), **Save as new**, **Delete**
  (with a confirmation); a refused save lists every problem. Rules of a
  loaded configuration that can no longer carry an HCR are left out with a
  message. The table lists every species of the contract: the HCR-eligible
  ones first and editable, the others greyed, not editable, and shown with
  **Show every species of the contract**. **Save as my rules** is removed.

---

## 2026-11-16 — Save as my rules

**Status:** built. Ruff, format, mypy strict clean; **286 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16. `node --check app.js` passes. **Not opened in a
browser.**

- `index.html`, `app.js`: in the New experiment tab, **Save as my rules**
  sends the ticked rows (tonnes × 1000 to kg) to
  `PUT /api/v1/scenarios/{name}/hcr`; nothing ticked deletes the user's saved
  rules for the scenario. A refused save lists every problem. After a save the
  form's rows keep the saved values, so a scenario switch and back starts
  from them. The heading says how many saved rules the form started from,
  instead of "your rules or the scenario defaults" (there are none, ADR 0024).

---

## 2026-11-16 — New experiment tab

**Status:** built. Ruff, format, mypy strict clean; **287 tests pass, all integration tests included** (PostgreSQL 17 in Docker), 2026-11-16. `node --check app.js` passes; every element id
the script uses exists; the page's tags balance. **Not opened in a browser.**

- `index.html`, `app.js`, `style.css`: tab **New experiment** (`#/experiments`)
  for every user. Scenario list from `GET /api/v1/scenarios`; the form from
  `GET /api/v1/scenarios/{name}/experiment-options`: name, end date limited to
  the contract's range, climate scenario when required, MSE (with its pods),
  and the HCR table (apply box, names, group, initial biomass and F, biomass
  limit and base in tonnes, fishing mortality per year), prefilled from the
  user's rules or the defaults. Submit sends `POST /api/v1/experiments` with
  the rules as shown (tonnes × 1000 to kg, ADR 0022) and lists the
  controller's objections from a 422. **My experiments**: status, progress,
  queue position, pods, a Cancel button while one is possible.
- The input for the experiment name is `exp_name`: a field called `name`
  would be hidden by the form's own `name` property.

---

## 2026-11-16 — Tabs: Home, Species, Users, Species import & export

**Status:** built. `node --check app.js` passes; every element id the script
uses exists in the page; the console tests pass (7). The page was **not
opened in a browser** (no database running for the species and users calls).

- `console/static/index.html`: a tab bar and four panels, `tab-home`
  (account, scenarios), `tab-species`, `tab-users` (admins),
  `tab-species-import` (admins).
- `console/static/app.js`: `TABS`, `currentTab()`, `openTab()` on
  `hashchange`; a member who opens an admin tab's address gets Home (the
  address is replaced, no history entry). Each tab loads its data when
  opened, instead of everything at sign-in.
- `console/static/style.css`: tab styles.

---

## 2026-11-16 — Species pages

**Status:** built. Ruff, format, mypy strict clean; 185 tests pass. The 98 integration tests were **skipped** (Docker not running): seeding, the import apply, export, CSRF on the import and the index plans are **not verified against PostgreSQL**; the console pages were **not opened in a browser**.

The user asked for them on 2026-11-16, so the "no admin editing screens"
decision now excepts species (README).

- `console/static/index.html`, `app.js`, `style.css`: a **Species** card for
  everyone (search, ISSCAAP group, family, order, sort, pager; calls
  `GET /api/v1/species`) and a **Species import and export** card for admins
  (calls `/api/v1/admin/species/export.csv` and `/import`). `call()` can send a
  file as the body (`raw`, `type`), with the CSRF header as before.
- Design: [scenario-catalog README § Console pages](../scenario-catalog/README.md#console-pages-user-2026-11-16).

---

## 2026-11-06 — Sign-in and home page served by the API

**Status:** built. The quality gate is clean: Ruff, format and mypy strict
report nothing, and 167 tests pass, 72 of them integration tests (PostgreSQL
in Docker), 7 of them new in `test_console.py`. **Verified** on the compose
stack (`--profile keycloak`, `CONTROLLER_MODE=fake`) through nginx at
`http://localhost:18080`:
- with curl: the page and its security headers, the redirect from
  `/api/v1/console`, password sign-in, `me`, scenarios, the admin user list,
  logout refused without the CSRF header (403) and accepted with it (204),
  and the SSO start redirecting to Keycloak.
- in headless Chrome (Playwright): a wrong password shows the API's message.
  Admin sign-in shows the account, the 3 scenarios and the 6 users. The
  session survives a reload. Sign-out ends it. SSO as `bob` goes through
  Keycloak and back to the console as a member, with no users section and no
  password button. No CSP violations and no script errors.

**Not verified:** the forced password change and the refresh after the
15-minute access token expires were not exercised in a browser. The SSO
callback errors (`carol`, no access) show the API's JSON (open question in
the README). Not run against EDITO.

`apps/backend/…`:

- `src/surimi_backend/console/__init__.py`: new. `install_console` mounts
  `static/` at `/api/v1/console/` with the security headers, adds the relative
  redirects from `/api/v1/console` and `/`, and keeps them out of OpenAPI.
- `src/surimi_backend/console/static/index.html`, `app.js`, `style.css`: new.
  The page: sign-in (password and SSO buttons), password change, and a home
  screen with the account, the scenarios and the users (admins).
- `src/surimi_backend/core/config.py`: `console_enabled` (default `true`).
- `src/surimi_backend/main.py`: calls `install_console`.
- `tests/test_console.py`: new. Covers the files, headers, no inline script,
  relative redirects, 404, absence from OpenAPI and the off switch.

`deployments/`:

- `compose.yml`: `CONSOLE_ENABLED` passed to `api` (default `true`).
- `.env.example`: `CONSOLE_ENABLED`.

**Deploy:** nothing; the page ships in the API image.
