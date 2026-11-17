// Backend console (docs/features/backend-console).
// Calls only the public JSON API. Session cookies are HttpOnly, so this script
// never sees a token. Requests that change data copy the readable surimi_csrf
// cookie into X-CSRF-Token (ADR 0004). Data from the API is written with
// textContent only, never as HTML.
"use strict";

const API = "/api/v1";
const CONSOLE = "/api/v1/console/";
const $ = (id) => document.getElementById(id);

// --- API calls ---------------------------------------------------------------

function csrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)surimi_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

let refreshing = null; // one refresh at a time; parallel 401s share it

function refreshSession() {
  if (!csrfToken()) return Promise.resolve(false);
  refreshing ??= call("POST", "/auth/refresh", undefined, { retry: false })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

// `retry`: on 401, refresh the session once and repeat the call. Off for the
// calls whose 401 means something else (wrong password). `raw` sends a file
// (Blob) as the body with Content-Type `type`, instead of JSON.
async function call(method, path, body, { retry = true, raw, type } = {}) {
  const headers = { Accept: "application/json" };
  if (raw !== undefined) headers["Content-Type"] = type;
  else if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const token = csrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }
  const res = await fetch(API + path, {
    method,
    headers,
    credentials: "same-origin",
    body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && retry && (await refreshSession())) {
    return call(method, path, body, { retry: false, raw, type });
  }
  return res;
}

async function errorText(res) {
  let message = `The API answered ${res.status}.`;
  try {
    const body = await res.json();
    if (body && body.error && body.error.message) message = body.error.message;
  } catch {
    // not JSON: keep the status
  }
  const wait = res.headers.get("Retry-After");
  if (res.status === 429 && wait) message += ` Try again in ${wait} s.`;
  return message;
}

// --- page helpers ------------------------------------------------------------

const VIEWS = ["loading", "view-login", "view-password", "view-home"];

function show(id) {
  for (const v of VIEWS) $(v).hidden = v !== id;
}

function setError(id, text) {
  $(id).textContent = text || "";
  $(id).hidden = !text;
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function when(iso) {
  return iso ? new Date(iso).toLocaleString() : "never";
}

async function busy(button, work) {
  button.disabled = true;
  try {
    await work();
  } finally {
    button.disabled = false;
  }
}

// --- state -------------------------------------------------------------------

let me = null;

function signedOut(message) {
  me = null;
  $("bar-user").hidden = true;
  $("login-form").reset();
  setError("login-error", message);
  show("view-login");
  loadProviders();
}

function signedIn(user) {
  me = user;
  $("bar-name").textContent = `${user.display_name} (${user.role})`;
  $("bar-user").hidden = false;
  if (user.must_change_password) openPassword(true);
  else renderHome();
}

// --- sign-in -----------------------------------------------------------------

let providersLoaded = false;

async function loadProviders() {
  if (providersLoaded) return;
  const res = await fetch(`${API}/auth/providers`, { credentials: "same-origin" });
  if (!res.ok) return;
  const providers = await res.json();
  providersLoaded = true;
  const box = $("sso-buttons");
  box.replaceChildren();
  for (const p of providers) {
    const a = el("a", `Sign in with ${p.display_name}`, "button secondary");
    a.href = `${p.login_url}?next=${encodeURIComponent(CONSOLE)}`;
    box.append(a);
  }
  $("sso").hidden = providers.length === 0;
}

$("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  setError("login-error", "");
  busy(form.querySelector("button[type=submit]"), async () => {
    const res = await call(
      "POST",
      "/auth/login",
      { login: form.login.value.trim(), password: form.password.value },
      { retry: false },
    );
    if (!res.ok) {
      setError("login-error", await errorText(res));
      form.password.value = "";
      return;
    }
    signedIn(await res.json());
  });
});

$("logout").addEventListener("click", async () => {
  await call("POST", "/auth/logout").catch(() => null);
  signedOut("");
});

// --- password ----------------------------------------------------------------

function openPassword(forced) {
  $("password-form").reset();
  $("password-form").username.value = me ? me.username : "";
  $("password-forced").hidden = !forced;
  $("password-cancel").hidden = forced;
  setError("password-error", "");
  show("view-password");
}

$("password-open").addEventListener("click", () => openPassword(false));
$("password-cancel").addEventListener("click", () => renderHome());

$("password-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  setError("password-error", "");
  busy(form.querySelector("button[type=submit]"), async () => {
    const res = await call(
      "POST",
      "/auth/password",
      { current_password: form.current_password.value, new_password: form.new_password.value },
      { retry: false },
    );
    if (!res.ok) {
      setError("password-error", await errorText(res));
      return;
    }
    const again = await call("GET", "/auth/me");
    if (!again.ok) return signedOut(await errorText(again));
    me = await again.json();
    renderHome(true);
  });
});

// --- home --------------------------------------------------------------------

function renderHome(passwordChanged = false) {
  const u = me;
  $("greeting").textContent = `Hello, ${u.first_name || u.display_name}`;
  $("password-done").hidden = !passwordChanged;

  const facts = [
    ["Name", u.display_name],
    ["E-mail", u.email],
    ["Username", u.username],
    ["Role", u.role_source === "idp" ? `${u.role} (from SSO)` : u.role],
    ["Account", u.account === "sso" ? "SSO" : "Local"],
    ["Last sign-in", when(u.last_login_at)],
    ["Sign-ins", u.login_count],
    ["Since", when(u.created_at)],
  ];
  const dl = $("account");
  dl.replaceChildren();
  for (const [k, v] of facts) dl.append(el("dt", k), el("dd", v));
  $("password-open").hidden = !u.has_password;

  const admin = u.role === "admin";
  for (const [key, tab] of Object.entries(TABS)) $(`tab-link-${key}`).hidden = tab.admin && !admin;
  show("view-home");
  openTab();
}

// --- tabs ----------------------------------------------------------------------
// One address per tab (#/home, #/species, …): Back works and a tab can be
// linked. A tab loads its data each time it is opened, not all at sign-in.

const TABS = {
  home: { admin: false, load: () => loadScenarios() },
  experiments: { admin: false, load: () => openExperiments() },
  species: { admin: false, load: () => loadSpecies(speciesPage) },
  users: { admin: true, load: () => loadUsers() },
  "species-import": { admin: true, load: null },
};

function currentTab() {
  const name = location.hash.replace(/^#\/?/, "");
  const tab = TABS[name];
  if (tab && !(tab.admin && me.role !== "admin")) return name;
  // Unknown, empty, or an admin tab for a member: Home, without a history entry.
  if (name) history.replaceState(null, "", "#/home");
  return "home";
}

function openTab() {
  if (!me || $("view-home").hidden) return;
  const name = currentTab();
  for (const key of Object.keys(TABS)) {
    const selected = key === name;
    $(`tab-${key}`).hidden = !selected;
    const link = $(`tab-link-${key}`);
    link.setAttribute("aria-selected", String(selected));
    link.classList.toggle("active", selected);
  }
  const { load } = TABS[name];
  if (load) load();
}

window.addEventListener("hashchange", openTab);

async function loadScenarios() {
  const list = $("scenarios");
  list.replaceChildren(el("li", "Loading…", "muted"));
  setError("scenarios-error", "");
  const res = await call("GET", "/scenarios");
  list.replaceChildren();
  if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
  if (!res.ok) return setError("scenarios-error", await errorText(res));
  const { scenarios } = await res.json();
  if (scenarios.length === 0) list.append(el("li", "The controller offers no scenarios.", "muted"));
  for (const s of scenarios) list.append(el("li", s.name));
}

async function loadUsers() {
  const body = $("users");
  body.replaceChildren();
  setError("users-error", "");
  $("users-total").textContent = "";
  const res = await call("GET", "/admin/users?size=50");
  if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
  if (!res.ok) return setError("users-error", await errorText(res));
  const page = await res.json();
  $("users-total").textContent =
    page.total > page.items.length ? `(${page.items.length} of ${page.total})` : `(${page.total})`;
  for (const u of page.items) {
    const tr = el("tr");
    const role = el("td", u.role);
    if (u.role_source === "idp") role.append(" ", el("span", "SSO", "badge"));
    tr.append(
      el("td", u.display_name),
      el("td", u.username),
      el("td", u.email),
      role,
      el("td", u.account === "sso" ? "SSO" : "Local"),
      el("td", u.is_active ? "yes" : "no"),
      el("td", when(u.last_login_at)),
    );
    body.append(tr);
  }
}

// --- new experiment (everyone) -------------------------------------------------
// The form is built from GET /scenarios/{name}/experiment-options: every species
// of the contract is in the "Add a species" dropdown, of which only the
// HCR-eligible ones can be added to the rules list; every row of the list is sent. Biomass is
// shown and typed in tonnes and sent in kg (ADR 0022). The request always
// carries the rules as shown, so what is on screen is what runs. Rules are kept
// in named configurations per scenario (ADR 0025,
// /scenarios/{name}/hcr-configurations); there are no scenario defaults.

const KG_PER_TONNE = 1000;
let expOptions = null;

const tonnes = (kg) => Number((kg / KG_PER_TONNE).toFixed(6));
const kilograms = (t) => Number((t * KG_PER_TONNE).toFixed(3));
const fmt = (value, digits) =>
  value === null || value === undefined
    ? "—"
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
const isoDate = (iso) => (iso ? iso.slice(0, 10) : "");
const entryKey = (code, stage) => `${code.toUpperCase()}|${(stage || "").toLowerCase()}`;
const entryLabel = (code, stage) => [code, stage].filter((x) => x).join(" ");
const configsUrl = () => `/scenarios/${encodeURIComponent(expOptions.scenario_name)}/hcr-configurations`;

function dayAfter(iso) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// The default end date: one year after the scenario's start (user, 2026-11-16),
// never past the contract's maximum. Experiments always start at the contract's
// start; only the end is chosen.
const DEFAULT_RUN_YEARS = 1;
function defaultEndDate(startIso, maxIso) {
  if (!startIso) return isoDate(maxIso);
  const d = new Date(startIso);
  d.setUTCFullYear(d.getUTCFullYear() + DEFAULT_RUN_YEARS);
  const end = d.toISOString().slice(0, 10);
  const max = isoDate(maxIso);
  return max && end > max ? max : end;
}

async function openExperiments() {
  loadMyExperiments();
  const select = $("exp-scenario");
  if (select.options.length > 1) return; // scenarios already listed
  setError("exp-options-error", "");
  const res = await call("GET", "/scenarios");
  if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
  if (!res.ok) return setError("exp-options-error", await errorText(res));
  const { scenarios } = await res.json();
  for (const s of scenarios) select.append(new Option(s.name, s.name));
}

function clearMessages() {
  $("exp-submitted").hidden = true;
  $("exp-config-notice").hidden = true;
  $("exp-config-problems").hidden = true;
  $("exp-problems").hidden = true;
  setError("exp-submit-error", "");
  setError("exp-config-error", "");
}

$("exp-scenario").addEventListener("change", async (event) => {
  const name = event.currentTarget.value;
  $("exp-form").hidden = true;
  clearMessages();
  setError("exp-options-error", "");
  expOptions = null;
  if (!name) return;
  const res = await call("GET", `/scenarios/${encodeURIComponent(name)}/experiment-options`);
  if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
  if (!res.ok) return setError("exp-options-error", await errorText(res));
  if ($("exp-scenario").value !== name) return; // another scenario chosen meanwhile
  expOptions = await res.json();
  renderExperimentForm(expOptions);
});

function numberInput(name, attrs) {
  const input = el("input");
  input.type = "number";
  input.name = name;
  input.step = "any";
  input.min = attrs.min ?? "0";
  if (attrs.max) input.max = attrs.max;
  input.className = "num";
  return input;
}

function renderExperimentForm(o) {
  const form = $("exp-form");
  form.reset();
  form.exp_name.value = `${o.scenario_name} ${new Date().toISOString().slice(0, 10)}`;
  const end = form.end_date;
  end.min = o.start_date_time ? dayAfter(o.start_date_time) : "";
  end.max = isoDate(o.maximum_end_date_time);
  end.value = defaultEndDate(o.start_date_time, o.maximum_end_date_time);
  $("exp-range").textContent =
    o.start_date_time && o.maximum_end_date_time
      ? `(the run starts ${isoDate(o.start_date_time)}; at most ${isoDate(o.maximum_end_date_time)}; one year by default)`
      : "";

  const climate = form.climate_scenario;
  climate.replaceChildren();
  for (const c of o.climate_scenarios) climate.append(new Option(c, c));
  $("exp-climate-label").hidden = !o.climate_scenario_required;

  $("exp-pods").textContent =
    `(${o.pods_mse_run} simulations, ${o.pods_mse_run} Ecopath pods; a single run takes ${o.pods_single_run})`;

  $("exp-hcr").replaceChildren();
  fillSpeciesPicker();
  showRulesState();

  fillConfigurations(o.hcr_configurations, "");
  $("exp-config-name").value = "";
  showConfigState();

  const notes = $("exp-notes");
  notes.replaceChildren();
  for (const n of o.notes) notes.append(el("li", n));
  form.hidden = false;
}

// --- species dropdown and rules list -----------------------------------------

const speciesText = (row) => {
  const name = row.species_name || row.species_code;
  const values =
    row.initial_biomass === null || row.initial_biomass === undefined
      ? ""
      : ` · initial biomass ${fmt(row.initial_biomass, 1)}, F ${fmt(row.initial_fishing_mortality, 3)}`;
  return `${name} (${entryLabel(row.species_code, row.life_stage)})${values}`;
};

const rowsInList = () => [...$("exp-hcr").querySelectorAll("tr[data-index]")];

// Every contract species: those that can carry an HCR and are not in the list yet
// can be chosen; the others are listed, greyed, for reference.
function fillSpeciesPicker() {
  const picker = $("exp-species-pick");
  const inList = new Set(rowsInList().map((tr) => tr.dataset.index));
  const byName = (a, b) => speciesText(expOptions.species[a]).localeCompare(speciesText(expOptions.species[b]));
  const indexes = [...expOptions.species.keys()];
  const eligible = indexes.filter((i) => expOptions.species[i].hcr_eligible).sort(byName);
  const others = indexes.filter((i) => !expOptions.species[i].hcr_eligible).sort(byName);
  const free = eligible.filter((i) => !inList.has(String(i)));
  picker.replaceChildren(
    new Option(free.length ? "Choose a species…" : "Every species that can carry a rule is in the list", ""),
  );
  const group = (label, items, disabled) => {
    if (items.length === 0) return;
    const g = document.createElement("optgroup");
    g.label = label;
    for (const i of items) {
      const option = new Option(speciesText(expOptions.species[i]), String(i));
      option.disabled = disabled;
      g.append(option);
    }
    picker.append(g);
  };
  group("Can carry a harvest control rule", free, false);
  group("Other species of the contract (no fisheries authority settings: a rule would fail)", others, true);
  $("exp-species-add").disabled = free.length === 0;
  $("exp-species-count").textContent =
    `${expOptions.species.length} species in the contract, ${eligible.length} can carry a rule.`;
}

function showRulesState() {
  const n = rowsInList().length;
  $("exp-rules-count").textContent = n
    ? `${n} rule${n === 1 ? "" : "s"} will be sent.`
    : "No rules: the experiment runs without harvest control rules. Add species above.";
  $("exp-hcr-table").hidden = n === 0;
}

// Adds a row for species `index`; `rule` (kg) fills its values. Returns the row.
function addRuleRow(index, rule) {
  const row = expOptions.species[index];
  const tr = el("tr");
  tr.dataset.index = String(index);
  tr.dataset.key = entryKey(row.species_code, row.life_stage);
  const inputs = [numberInput("limit", {}), numberInput("base", {}), numberInput("f_max", { max: "100" })];
  if (rule) {
    inputs[0].value = String(tonnes(rule.biomass_limit_kg));
    inputs[1].value = String(tonnes(rule.biomass_base_kg));
    inputs[2].value = String(rule.f_max);
  }
  const species = el("td", row.species_name || row.species_code, "wrap");
  species.append(el("div", entryLabel(row.species_code, row.life_stage), "muted small"));
  const remove = el("button", "Remove", "secondary small-button");
  remove.type = "button";
  remove.addEventListener("click", () => {
    tr.remove();
    fillSpeciesPicker();
    showRulesState();
  });
  const cell = (node) => {
    const td = el("td");
    td.append(node);
    return td;
  };
  tr.append(
    species,
    el("td", row.functional_group_name || row.functional_group || "—", "wrap"),
    el("td", fmt(row.initial_biomass, 1)),
    el("td", fmt(row.initial_fishing_mortality, 3)),
    ...inputs.map(cell),
    cell(remove),
  );
  $("exp-hcr").append(tr);
  return tr;
}

$("exp-species-add").addEventListener("click", () => {
  const value = $("exp-species-pick").value;
  if (!expOptions || value === "") return;
  const tr = addRuleRow(Number(value), null);
  fillSpeciesPicker();
  showRulesState();
  tr.querySelector("input[name=limit]").focus();
});

// --- HCR configurations -------------------------------------------------------

function fillConfigurations(summaries, selected) {
  const select = $("exp-config");
  select.replaceChildren(new Option("(none: start empty)", ""));
  for (const c of summaries) {
    select.append(new Option(`${c.name} (${c.rule_count} rule${c.rule_count === 1 ? "" : "s"})`, c.id));
  }
  select.value = selected;
  expOptions.hcr_configurations = summaries;
}

function showConfigState() {
  const chosen = $("exp-config").value !== "";
  $("exp-config-save").disabled = !chosen;
  $("exp-config-delete").disabled = !chosen;
  const n = expOptions.hcr_configurations.length;
  $("exp-rules-source").textContent = n
    ? `(${n} saved configuration${n === 1 ? "" : "s"} for this scenario)`
    : "(no saved configurations for this scenario)";
}

// Replaces the list with a configuration's rules; returns the rules left out
// because their entry can no longer carry a rule here.
function applyRules(rules) {
  $("exp-hcr").replaceChildren();
  const left = [];
  for (const rule of rules) {
    const key = entryKey(rule.species_code, rule.life_stage);
    const index = expOptions.species.findIndex(
      (row) => row.hcr_eligible && entryKey(row.species_code, row.life_stage) === key,
    );
    if (index === -1) left.push(entryLabel(rule.species_code, rule.life_stage));
    else addRuleRow(index, rule);
  }
  fillSpeciesPicker();
  showRulesState();
  return left;
}

$("exp-config").addEventListener("change", async (event) => {
  clearMessages();
  const id = event.currentTarget.value;
  showConfigState();
  if (!id) {
    $("exp-config-name").value = "";
    applyRules([]);
    return;
  }
  const res = await call("GET", `${configsUrl()}/${id}`);
  if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
  if (!res.ok) return setError("exp-config-error", await errorText(res));
  const config = await res.json();
  if ($("exp-config").value !== id) return; // another one chosen meanwhile
  $("exp-config-name").value = config.name;
  const left = applyRules(config.rules);
  if (left.length) {
    setError("exp-config-error", `Left out, no longer able to carry a rule here: ${left.join(", ")}. Saving drops them.`);
  }
});

// The rules to send (every row of the list), or an error message for the first
// row that is not complete.
function collectRules() {
  const rules = [];
  for (const tr of rowsInList()) {
    const row = expOptions.species[Number(tr.dataset.index)];
    const label = entryLabel(row.species_code, row.life_stage);
    const value = (name) => tr.querySelector(`input[name=${name}]`).value.trim();
    const [limit, base, fmax] = [value("limit"), value("base"), value("f_max")].map(Number);
    if (![value("limit"), value("base"), value("f_max")].every((v) => v !== "")) {
      return { error: `${label}: fill in the biomass limit, the biomass base and the fishing mortality, or remove it.` };
    }
    if (!(limit > 0)) return { error: `${label}: the biomass limit must be above 0 t.` };
    if (!(base > limit)) {
      return {
        error: `${label}: the biomass base (${base} t) must be above the biomass limit (${limit} t): ` +
          "below the limit no catch is allowed, above the base the full fishing mortality applies.",
      };
    }
    if (!(fmax > 0 && fmax <= 100)) return { error: `${label}: the fishing mortality must be above 0 and at most 100.` };
    rules.push({
      species_code: row.species_code,
      life_stage: row.life_stage,
      biomass_limit_kg: kilograms(limit),
      biomass_base_kg: kilograms(base),
      f_max: fmax,
    });
  }
  return { rules };
}

const describeRules = (rules) =>
  rules.length === 0
    ? "no harvest control rules"
    : `${rules.length} harvest control rule${rules.length === 1 ? "" : "s"} (${rules
        .map((r) => entryLabel(r.species_code, r.life_stage))
        .join(", ")})`;

// Shows a refused request: every problem when the API lists them.
async function showRefusal(res, errorId, listId, intro) {
  const body = await res.clone().json().catch(() => null);
  const problems = body && body.error && body.error.details && body.error.details.problems;
  if (Array.isArray(problems)) {
    $(listId).replaceChildren(...problems.map((p) => el("li", p)));
    $(listId).hidden = false;
    return setError(errorId, intro);
  }
  return setError(errorId, await errorText(res));
}

async function refreshConfigurations(selected) {
  const res = await call("GET", configsUrl());
  if (!res.ok) return;
  const { configurations } = await res.json();
  fillConfigurations(
    configurations.map((c) => ({ id: c.id, name: c.name, rule_count: c.rules.length, updated_at: c.updated_at })),
    selected,
  );
  showConfigState();
}

async function saveConfiguration(button, asNew) {
  clearMessages();
  if (!expOptions) return;
  const name = $("exp-config-name").value.trim();
  if (!name) return setError("exp-config-error", "Give the configuration a name.");
  const { rules, error } = collectRules();
  if (error) return setError("exp-config-error", error);
  const id = $("exp-config").value;
  busy(button, async () => {
    const res = asNew
      ? await call("POST", configsUrl(), { name, rules })
      : await call("PUT", `${configsUrl()}/${id}`, { name, rules });
    if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
    if (!res.ok) return showRefusal(res, "exp-config-error", "exp-config-problems", "The configuration was not saved:");
    const saved = await res.json();
    await refreshConfigurations(saved.id);
    $("exp-config-notice").textContent = `Saved “${saved.name}” with ${describeRules(saved.rules)}.`;
    $("exp-config-notice").hidden = false;
  }).then(showConfigState); // busy() re-enables the button; Save needs a chosen one
}

$("exp-config-save").addEventListener("click", (event) => saveConfiguration(event.currentTarget, false));
$("exp-config-new").addEventListener("click", (event) => saveConfiguration(event.currentTarget, true));

$("exp-config-delete").addEventListener("click", (event) => {
  clearMessages();
  const id = $("exp-config").value;
  if (!expOptions || !id) return;
  const name = $("exp-config-name").value.trim() || "this configuration";
  if (!window.confirm(`Delete “${name}”? Experiments already submitted keep their rules.`)) return;
  busy(event.currentTarget, async () => {
    const res = await call("DELETE", `${configsUrl()}/${id}`);
    if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
    if (!res.ok && res.status !== 404) return setError("exp-config-error", await errorText(res));
    await refreshConfigurations("");
    $("exp-config-name").value = "";
    $("exp-config-notice").textContent = `Deleted “${name}”. The rules stay on screen until you change them.`;
    $("exp-config-notice").hidden = false;
  }).then(showConfigState);
});

// --- submit -------------------------------------------------------------------

$("exp-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  clearMessages();
  if (!expOptions) return;
  if (!form.exp_name.value.trim()) return setError("exp-submit-error", "Give the experiment a name.");
  if (!form.end_date.value) return setError("exp-submit-error", "Choose an end date.");
  const { rules, error } = collectRules();
  if (error) return setError("exp-submit-error", error);
  const request = {
    name: form.exp_name.value.trim(),
    scenario_name: expOptions.scenario_name,
    end_date_time: `${form.end_date.value}T00:00:00Z`,
    is_mse_run: form.is_mse_run.checked,
    climate_scenario: expOptions.climate_scenario_required ? form.climate_scenario.value : null,
    harvest_control_rules: rules,
  };
  busy($("exp-submit"), async () => {
    const res = await call("POST", "/experiments", request);
    if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
    if (!res.ok) return showRefusal(res, "exp-submit-error", "exp-problems", "The controller would refuse this experiment:");
    const created = await res.json();
    const where = created.queue_position ? `, position ${created.queue_position} in the queue` : "";
    $("exp-submitted").textContent =
      `“${created.name}” is ${created.status}${where}, with ${describeRules(rules)}. ` +
      `It takes ${created.pods_required} Ecopath pod(s).`;
    $("exp-submitted").hidden = false;
    loadMyExperiments();
  });
});

// --- my experiments --------------------------------------------------------------

const CANCELLABLE = new Set(["queued", "submitting", "submitted", "initialising", "initialised", "running"]);

async function loadMyExperiments() {
  const body = $("exp-list");
  setError("exp-list-error", "");
  const res = await call("GET", "/experiments?size=20&sort=-created_at");
  if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
  if (!res.ok) return setError("exp-list-error", await errorText(res));
  const page = await res.json();
  $("exp-total").textContent = page.total > page.items.length ? `(${page.items.length} of ${page.total})` : `(${page.total})`;
  body.replaceChildren();
  if (page.items.length === 0) {
    const td = el("td", "No experiments yet.", "muted");
    td.colSpan = 8;
    const tr = el("tr");
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const e of page.items) {
    const tr = el("tr");
    const status = el("td", e.status);
    if (e.stalled) status.append(" ", el("span", "stalled", "badge"));
    if (e.error) status.title = e.error;
    const action = el("td");
    if (CANCELLABLE.has(e.status)) {
      const cancel = el("button", "Cancel", "secondary small-button");
      cancel.type = "button";
      cancel.addEventListener("click", () =>
        busy(cancel, async () => {
          if (!window.confirm(`Cancel “${e.name}”?`)) return;
          const r = await call("POST", `/experiments/${e.id}/cancel`);
          if (!r.ok) return setError("exp-list-error", await errorText(r));
          loadMyExperiments();
        }),
      );
      action.append(cancel);
    }
    if (e.status === "completed") action.append(downloadButton(e));
    tr.append(
      el("td", e.name, "wrap"),
      el("td", e.scenario_name),
      status,
      el("td", e.progress === null || e.progress === undefined ? "—" : `${Math.round(e.progress * 100)} %`),
      el("td", e.queue_position ?? "—"),
      el("td", e.pods_required),
      el("td", when(e.created_at)),
      action,
    );
    body.append(tr);
  }
}

// The .nc through a presigned link (GET .../outputs/download-url): the browser fetches
// it from the bucket directly; the link works for PRESIGNED_URL_TTL_SECONDS (1 hour by
// default). In local mode (no S3) the link is the API's own download path.
function downloadButton(e) {
  const button = el("button", "Download .nc", "secondary small-button");
  button.type = "button";
  button.addEventListener("click", () =>
    busy(button, async () => {
      setError("exp-list-error", "");
      $("exp-list-notice").hidden = true;
      const r = await call("GET", `/experiments/${e.id}/outputs/download-url?file=nc`);
      if (r.status === 401) return signedOut("Your session has ended. Sign in again.");
      if (!r.ok) return setError("exp-list-error", await errorText(r));
      const link = await r.json();
      const size = (link.size_bytes / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 });
      const until = link.expires_at ? `; the link works until ${when(link.expires_at)}` : "";
      $("exp-list-notice").textContent = `Downloading ${link.file_name} (${size} MB)${until}.`;
      $("exp-list-notice").hidden = false;
      window.location.assign(link.url); // Content-Disposition: attachment, so the page stays
    }),
  );
  return button;
}

$("exp-refresh").addEventListener("click", (event) => busy(event.currentTarget, loadMyExperiments));

// --- species (everyone) ------------------------------------------------------

const SPECIES_PAGE_SIZE = 25;
let speciesPage = 1;

function speciesQuery(page) {
  const form = $("species-filter");
  const params = new URLSearchParams();
  for (const name of ["q", "isscaap_group", "family", "order_or_higher_taxa"]) {
    const value = form[name].value.trim();
    if (value) params.set(name, value);
  }
  params.set("sort", form.sort.value);
  params.set("page", String(page));
  params.set("size", String(SPECIES_PAGE_SIZE));
  return params;
}

async function loadSpecies(page) {
  const body = $("species");
  setError("species-error", "");
  const res = await call("GET", `/species?${speciesQuery(page)}`);
  if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
  if (!res.ok) {
    body.replaceChildren();
    return setError("species-error", await errorText(res));
  }
  const result = await res.json();
  speciesPage = result.page;
  const pages = Math.max(1, Math.ceil(result.total / result.size));
  $("species-total").textContent = `(${result.total.toLocaleString()})`;
  $("species-page").textContent = `Page ${result.page.toLocaleString()} of ${pages.toLocaleString()}`;
  $("species-prev").disabled = result.page <= 1;
  $("species-next").disabled = result.page >= pages;
  body.replaceChildren();
  if (result.items.length === 0) {
    const td = el("td", "No species match.", "muted");
    td.colSpan = 7;
    const tr = el("tr");
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const s of result.items) {
    const tr = el("tr");
    tr.append(
      el("td", s.species_code),
      el("td", s.name ?? "—", "wrap"),
      el("td", s.scientific_name ?? "—", "wrap"),
      el("td", s.family ?? "—"),
      el("td", s.order_or_higher_taxa ?? "—", "wrap"),
      el("td", s.isscaap_group ?? "—"),
      el("td", s.source),
    );
    body.append(tr);
  }
}

$("species-filter").addEventListener("submit", (event) => {
  event.preventDefault();
  loadSpecies(1);
});
$("species-filter").sort.addEventListener("change", () => loadSpecies(1));
$("species-clear").addEventListener("click", () => {
  $("species-filter").reset();
  loadSpecies(1);
});
$("species-prev").addEventListener("click", () => loadSpecies(speciesPage - 1));
$("species-next").addEventListener("click", () => loadSpecies(speciesPage + 1));

// --- species import and export (admins) --------------------------------------

const SPECIES_COLUMNS = [
  "species_code", "name", "scientific_name", "family", "order_or_higher_taxa", "isscaap_group", "source",
];
// As the API: a table column takes the file column of its own name, else its
// ASFIS header, so FAO's ASFIS file needs no mapping.
const ASFIS_HEADERS = {
  species_code: "Alpha3_Code",
  name: "English_name",
  scientific_name: "Scientific_Name",
  family: "Family",
  order_or_higher_taxa: "Order or higher taxa",
  isscaap_group: "ISSCAAP_Group",
};
const normHeader = (h) => h.trim().split(/\s+/).join(" ").toLowerCase();

let importFile = null;
let checkedKey = null; // file and options of the last clean dry run

// The first line of a CSV, with quoted cells.
function parseHeader(text, delimiter) {
  const line = text.replace(/^﻿/, "");
  const sep = delimiter === "tab" ? "\t" : delimiter;
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      cells.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") break;
    else cell += ch;
  }
  cells.push(cell.trim());
  return cells.filter((c) => c);
}

function importParams(dryRun) {
  const form = $("species-import");
  const params = new URLSearchParams({
    mode: form.mode.value,
    dry_run: String(dryRun),
    delimiter: form.delimiter.value,
    default_source: form.default_source.value,
  });
  // Every column explicitly: what the form shows is what the API uses.
  for (const select of $("species-mapping-rows").querySelectorAll("select")) {
    params.append("map", `${select.name}:${select.value}`);
  }
  return params;
}

function importKey() {
  if (!importFile) return null;
  const f = importFile;
  return JSON.stringify([f.name, f.size, f.lastModified, importParams(true).toString()]);
}

function resetCheck() {
  checkedKey = null;
  $("species-apply").disabled = true;
}

async function readHeader() {
  resetCheck();
  $("species-report").hidden = true;
  setError("species-import-error", "");
  const form = $("species-import");
  importFile = form.file.files[0] || null;
  const box = $("species-mapping-rows");
  box.replaceChildren();
  if (!importFile) {
    $("species-mapping").hidden = true;
    return;
  }
  const headers = parseHeader(await importFile.slice(0, 65536).text(), form.delimiter.value);
  for (const target of SPECIES_COLUMNS) {
    const label = el("label", target);
    const select = document.createElement("select");
    select.name = target;
    select.append(new Option("(not mapped)", ""));
    for (const h of headers) select.append(new Option(h, h));
    const asfis = ASFIS_HEADERS[target];
    const guess =
      headers.find((h) => normHeader(h) === normHeader(target)) ??
      (asfis ? headers.find((h) => normHeader(h) === normHeader(asfis)) : undefined);
    select.value = guess ?? "";
    select.addEventListener("change", resetCheck);
    label.append(select);
    box.append(label);
  }
  $("species-mapping").hidden = false;
}

function countText(c) {
  if (c.count === 0) return "0";
  const more = c.count > c.codes.length ? ", …" : "";
  return `${c.count.toLocaleString()} (${c.codes.join(", ")}${more})`;
}

function showReport(r) {
  $("species-report").hidden = false;
  $("species-report-title").textContent = r.applied
    ? "Imported"
    : r.errors.length
      ? r.dry_run ? "Check: the file has errors, nothing would change" : "Not imported: the file has errors"
      : "Check: ready to import";
  const facts = [
    ["Mode", r.mode],
    ["Rows read", r.rows_read.toLocaleString()],
    ["Inserted", countText(r.inserted)],
    ["Updated", countText(r.updated)],
    ["Unchanged", r.unchanged.toLocaleString()],
    ["Deleted", countText(r.deleted)],
    ["Mapping", Object.entries(r.mapping).map(([t, h]) => `${t} ← ${h}`).join("; ") || "none"],
    ["Default source", r.default_source],
  ];
  const dl = $("species-report-facts");
  dl.replaceChildren();
  for (const [k, v] of facts) dl.append(el("dt", k), el("dd", v));
  const errors = $("species-report-error-list");
  errors.replaceChildren();
  for (const e of r.errors) errors.append(el("li", e.line ? `Line ${e.line}: ${e.message}` : e.message));
  $("species-report-errors").hidden = r.errors.length === 0;
  const warnings = $("species-report-warning-list");
  warnings.replaceChildren();
  for (const w of r.warnings) warnings.append(el("li", w));
  $("species-report-warnings").hidden = r.warnings.length === 0;
}

async function runImport(dryRun) {
  setError("species-import-error", "");
  if (!importFile) return setError("species-import-error", "Choose a CSV file first.");
  const key = importKey();
  const res = await call("POST", `/admin/species/import?${importParams(dryRun)}`, undefined, {
    raw: importFile,
    type: "text/csv",
  });
  if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
  let report = null;
  if (res.ok) report = await res.json();
  else if (res.status === 422) {
    const body = await res.json().catch(() => null);
    const details = body && body.error && body.error.details;
    if (details && details.mode) report = details;
    else {
      const message = body && body.error ? body.error.message : "The API answered 422.";
      return setError("species-import-error", message);
    }
  } else return setError("species-import-error", await errorText(res));
  showReport(report);
  if (dryRun) {
    checkedKey = report.errors.length === 0 ? key : null;
    $("species-apply").disabled = checkedKey === null;
  } else if (report.applied) {
    resetCheck();
    loadSpecies(speciesPage);
  }
}

$("species-import").file.addEventListener("change", readHeader);
$("species-import").delimiter.addEventListener("change", readHeader);
$("species-import").mode.addEventListener("change", resetCheck);
$("species-import").default_source.addEventListener("change", resetCheck);

$("species-check").addEventListener("click", (event) => {
  busy(event.currentTarget, () => runImport(true));
});

$("species-apply").addEventListener("click", (event) => {
  const button = event.currentTarget;
  if (importKey() !== checkedKey) {
    resetCheck();
    return setError("species-import-error", "The file or the options changed: check again first.");
  }
  if (
    $("species-import").mode.value === "replace" &&
    !window.confirm("Replace the whole species table with this file? Rows not in it will be deleted.")
  ) return;
  busy(button, () => runImport(false));
});

$("species-export").addEventListener("click", (event) => {
  busy(event.currentTarget, async () => {
    setError("species-import-error", "");
    const res = await call("GET", "/admin/species/export.csv");
    if (res.status === 401) return signedOut("Your session has ended. Sign in again.");
    if (!res.ok) return setError("species-import-error", await errorText(res));
    const url = URL.createObjectURL(await res.blob());
    const a = el("a");
    a.href = url;
    a.download = "species.csv";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
});

// --- start -------------------------------------------------------------------

(async function start() {
  try {
    const res = await call("GET", "/auth/me");
    if (res.ok) return signedIn(await res.json());
    signedOut(res.status === 401 ? "" : await errorText(res));
  } catch {
    signedOut("The API cannot be reached.");
  }
})();
