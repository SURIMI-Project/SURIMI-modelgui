import assert from "node:assert/strict";
import { test } from "node:test";
import axios, { AxiosHeaders } from "axios";
import { createRequest } from "../src/network/request";
import { AppError } from "../src/network/errors/appError";
import { validateRequest } from "../src/network/services/validateRequest";
import { experimentOptionsSchema } from "../src/network/services/scenarios/scenarioSchemas";
import { createExperimentPayloadSchema, createExperimentSchemaForOptions, experimentDetailSchema,
  experimentFiltersSchema, experimentPageSchema } from "../src/network/services/experiments/experimentSchemas";
import { hcrConfigurationPayloadSchema } from "../src/network/services/hcrConfigurations/hcrConfigurationSchemas";
import { eventFeedSchema, type EventFeed, type EventFilters } from "../src/network/services/events/eventSchemas";
import eventService from "../src/network/services/events/eventService";
import { experimentOutputsSchema, outputDownloadUrlSchema, outputMapParamsSchema,
  outputMapSchema, outputSeriesSchema } from "../src/network/services/outputs/outputSchemas";
import { createQueryClient } from "../src/serverState/queryClient";
import { authQueryKeys } from "../src/serverState/auth/authQueryKeys";
import { replaceSession } from "../src/serverState/auth/sessionCache";
import { isCurrentSession, requireCurrentSession } from "../src/serverState/useServerSession";
import { experimentQueryKeys } from "../src/serverState/experiments/experimentQueryKeys";
import { outputQueryKeys } from "../src/serverState/outputs/outputQueryKeys";
import { scenarioQueryKeys } from "../src/serverState/scenarios/scenarioQueryKeys";
import { hcrConfigurationQueryKeys } from "../src/serverState/hcrConfigurations/hcrConfigurationQueryKeys";
import { eventQueryKeys } from "../src/serverState/events/eventQueryKeys";
import { experimentEventsQueryOptions, experimentEventPollInterval } from "../src/serverState/events/useExperimentEvents";

const id = "c31e593b-b48c-4d5c-917c-6b709765ac3a";
const otherId = "e31e593b-b48c-4d5c-917c-6b709765ac3a";
const at = "2026-11-17T10:00:00+00:00";
const rule = { species_code: "HKE", life_stage: "adult", biomass_limit_kg: 4000000,
  biomass_base_kg: 16000000, f_max: 2.082 };
const options = experimentOptionsSchema.parse({
  scenario_name: "northwestern_med", start_date_time: "2013-01-01T00:00:00Z",
  maximum_end_date_time: "2050-01-01T00:00:00Z", climate_scenarios: ["RCP_4.5"], climate_scenario_required: true,
  pods_single_run: 1, pods_mse_run: 5, species: [
    { species_code: "HKE", life_stage: "adult", hcr_eligible: true, species_name: "European hake",
      scientific_name: null, functional_group: "27", functional_group_name: "Adult hake",
      initial_biomass: 54016.12, initial_fishing_mortality: 2.082 },
    { species_code: "HKE", life_stage: "juvenile", hcr_eligible: false, species_name: "European hake",
      scientific_name: null, functional_group: "28", functional_group_name: null,
      initial_biomass: null, initial_fishing_mortality: null },
  ],
  hcr_configurations: [{ id, name: "Conservative", rule_count: 1, updated_at: at }],
  initial_values_available: true, notes: ["Biomass unit is not confirmed."],
});
const payload = { name: "My simulation", scenario_name: "northwestern_med",
  end_date_time: "2030-01-01T00:00:00Z", climate_scenario: "RCP_4.5", harvest_control_rules: [rule] };
const experiment = {
  id, name: "My simulation", scenario_name: "northwestern_med", owner_id: id, owner_username: null,
  status: "copying_results", controller_status_raw: "Finished", is_mse_run: false, pods_required: 1,
  simulation_counts: { finished: 1 }, priority: 0, queue_position: null, estimated_start_at: null,
  progress: 1, stalled: false, stalled_reason: null, error: null, end_date_time: payload.end_date_time,
  climate_scenario: "RCP_4.5", outputs_state: "waiting_for_file", cloned_from_id: null,
  created_at: at, queued_at: at, submitted_at: at, started_at: at, finished_at: at,
  completed_at: null, cancel_requested_at: null,
};
const selection = { species: null, life_stage: null, functional_group: "27", fleet: null, market: null };
const cleaned = { non_finite: 2, out_of_range: 1 };
const feed = (last_id: number, events: EventFeed["events"] = [], has_more = false): EventFeed =>
  ({ events, last_id, has_more, poll_after_seconds: 10 });
const event = (experimentId = id) => ({ id: 43, type: "experiment.outputs_ready",
  data: { experiment_id: experimentId, scenario_name: "northwestern_med", status: "completed", size_bytes: 200 }, at });

const compileTimeChecks = () => {
  // @ts-expect-error datetime is an ISO string, not a Date instance
  const invalid: import("../src/network/services/experiments/experimentSchemas").CreateExperimentPayload = { ...payload, end_date_time: new Date() };
  void invalid;
};
void compileTimeChecks;

test("options preserve life stages, missing reference values, and mortality above one", () => {
  assert.equal(options.species[0].initial_fishing_mortality, 2.082);
  assert.equal(options.species[1].initial_fishing_mortality, null);
  assert.equal(options.species[1].hcr_eligible, false);
  assert.equal("rule" in options.species[0], false);
  assert.equal(experimentOptionsSchema.safeParse({ ...options, species: [{ species_code: "HKE" }] }).success, false);
});

test("HCRs validate kg bounds, ordering, duplicates, and unsupported fields", () => {
  const parse = (rules: unknown[]) => hcrConfigurationPayloadSchema.safeParse({ name: "  Saved  ", rules });
  assert.equal(parse([rule]).success, true);
  assert.equal(hcrConfigurationPayloadSchema.parse({ name: "  Saved  " }).name, "Saved");
  for (const bad of [
    { ...rule, biomass_limit_kg: 0 }, { ...rule, biomass_limit_kg: 16000000 },
    { ...rule, biomass_base_kg: 3.3e12 + 1 }, { ...rule, f_max: 101 },
    { ...rule, f_min: 0 }, { ...rule, f_max: NaN },
  ]) assert.equal(parse([bad]).success, false);
  assert.equal(parse([rule, { ...rule, life_stage: "ADULT" }]).success, false);
  assert.equal(parse([rule, { ...rule, life_stage: "juvenile" }]).success, true);
});

test("experiment schema rejects conflicting HCR sources and timezone-free dates", () => {
  assert.equal(createExperimentPayloadSchema.safeParse(payload).success, true);
  assert.equal(createExperimentPayloadSchema.safeParse({ ...payload, hcr_configuration_id: id }).success, false);
  assert.equal(createExperimentPayloadSchema.safeParse({ ...payload, harvest_control_rules: [], hcr_configuration_id: id }).success, false);
  assert.equal(createExperimentPayloadSchema.safeParse({ ...payload, end_date_time: "2030-01-01T00:00:00" }).success, false);
  assert.equal(createExperimentPayloadSchema.safeParse({ ...payload, duration: 10 }).success, false);
});

test("case-aware creation checks dates, climate, species/life stage and configuration ownership summaries", () => {
  const schema = createExperimentSchemaForOptions(options);
  assert.equal(schema.safeParse(payload).success, true);
  for (const bad of [
    { ...payload, scenario_name: "aegean_sea" }, { ...payload, climate_scenario: undefined },
    { ...payload, climate_scenario: "SSP2-4.5" }, { ...payload, end_date_time: options.start_date_time },
    { ...payload, end_date_time: "2051-01-01T00:00:00Z" },
    { ...payload, harvest_control_rules: [{ ...rule, life_stage: "juvenile" }] },
    { ...payload, harvest_control_rules: undefined, hcr_configuration_id: otherId },
  ]) assert.equal(schema.safeParse(bad).success, false);
  assert.equal(schema.safeParse({ ...payload, harvest_control_rules: undefined, hcr_configuration_id: id }).success, true);
  assert.equal(createExperimentSchemaForOptions({ ...options, start_date_time: null }).safeParse(payload).success, false);
});

test("a case without climate or HCR supports omission, rather than invented defaults", () => {
  const schema = createExperimentSchemaForOptions({ ...options, scenario_name: "aegean_sea",
    climate_scenarios: [], climate_scenario_required: false, species: [], hcr_configurations: [] });
  const body = { name: "Aegean", scenario_name: "aegean_sea", end_date_time: payload.end_date_time };
  assert.equal(schema.safeParse(body).success, true);
  assert.equal(schema.safeParse({ ...body, climate_scenario: "RCP_4.5" }).success, false);
  assert.equal(schema.safeParse({ ...body, harvest_control_rules: [rule] }).success, false);
});

test("paginated experiments and detail follow backend envelopes without inventing stored-request types", () => {
  assert.equal(experimentPageSchema.parse({ items: [experiment], total: 1, page: 1, size: 20 }).items[0].status, "copying_results");
  const detail = experimentDetailSchema.parse({ ...experiment, request: { custom_future_field: true },
    protocol_version: "protocol-version", simulations: [], events: [event()] });
  assert.equal(detail.request.custom_future_field, true);
  assert.equal(experimentPageSchema.safeParse({ items: [experiment], total: "1", page: 1, size: 20 }).success, false);
  assert.equal(experimentFiltersSchema.safeParse({ size: 201 }).success, false);
  assert.equal(experimentFiltersSchema.safeParse({ sort: "newest" }).success, false);
});

test("outputs handle absent results, nullable chart points, cleaning counts and map dimensions", () => {
  const metadata = experimentOutputsSchema.parse({ experiment_id: id, state: null, error: null,
    size_bytes: null, indexed_at: null, parser_version: null, report: null });
  assert.deepEqual(metadata.series_metrics, []);
  const ready = experimentOutputsSchema.parse({ ...metadata, state: "ready",
    species: [{ species_code: "HKE", life_stage: "adult", name: "European hake", functional_group: "27" }],
    fleets: [{ index: 0, country_code: "GRC", gear_code: "OTB" }],
    grid: { lat: [35, 40], lon: [20, 25], shape: [2, 3] } });
  assert.equal(ready.species[0].name, "European hake");
  assert.equal(ready.grid?.shape[1], 3);
  assert.equal(experimentOutputsSchema.safeParse({ ...ready, fleets: [{ index: "0" }] }).success, false);
  const series = outputSeriesSchema.parse({ metric: "biomass", unit: "t", period: "year", ...selection,
    points: [{ period: "2013", value: null }], cleaned });
  assert.equal(series.points[0].value, null);
  assert.deepEqual(series.cleaned, cleaned);
  const grid = { metric: "biomass", unit: "t", period: "2013", ...selection,
    shape: [1, 2], lat: [40], lon: [20, 21], values: [[1, null]], cleaned };
  assert.equal(outputMapSchema.safeParse(grid).success, true);
  assert.equal(outputMapSchema.safeParse({ ...grid, values: [[1]] }).success, false);
  assert.equal(outputMapParamsSchema.safeParse({ metric: "biomass", functional_group: "27", year: "2013" }).success, true);
  for (const invalid of [
    { metric: "biomass", year: "2013" },
    { metric: "biomass", species: "HKE", functional_group: "27", year: "2013" },
    { metric: "biomass", species: "HKE", year: "2013", month: "2013-01" },
    { metric: "biomass", species: "HKE", month: "2013-13" },
  ]) assert.equal(outputMapParamsSchema.safeParse(invalid).success, false);
});

test("download links allow signed external URLs and authenticated local API paths", () => {
  const download = { file: "nc", file_name: "output.nc", size_bytes: 1700000000,
    url: "https://storage.example.org/output.nc?signature=secret", presigned: true, expires_at: at };
  assert.equal(outputDownloadUrlSchema.safeParse(download).success, true);
  assert.equal(outputDownloadUrlSchema.safeParse({ ...download, url: "/api/v1/experiments/id/outputs/download?file=nc",
    presigned: false, expires_at: null }).success, true);
  assert.equal(outputDownloadUrlSchema.safeParse({ ...download, url: "javascript:alert(1)" }).success, false);
});

test("invalid creation is blocked before HTTP and malformed successful responses are rejected", async () => {
  let calls = 0;
  const client = axios.create({ adapter: async (config) => {
    calls++;
    return { data: { items: [], total: "wrong" }, status: 200, statusText: "OK", config, headers: new AxiosHeaders() };
  } });
  const api = createRequest(client);
  await assert.rejects(api.request({ path: "/experiments", method: "POST", payloadSchema: createExperimentPayloadSchema,
    payload: { ...payload, hcr_configuration_id: id }, responseSchema: experimentPageSchema }),
  (error: unknown) => error instanceof AppError && error.kind === "payloadValidation");
  assert.equal(calls, 0);
  await assert.rejects(api.request({ path: "/experiments", method: "GET", responseSchema: experimentPageSchema }),
    (error: unknown) => error instanceof AppError && error.kind === "invalidResponse");
  assert.throws(() => validateRequest(experimentFiltersSchema, { size: 500 }),
    (error: unknown) => error instanceof AppError && error.kind === "payloadValidation");
});

test("all protected resource keys separate users, pagination, case and chart selections", () => {
  const keys = (userId: string) => [
    scenarioQueryKeys.experimentOptions(userId, "aegean_sea"),
    experimentQueryKeys.list(userId, { scenario: "aegean_sea", page: 1 }),
    experimentQueryKeys.detail(userId, id), hcrConfigurationQueryKeys.detail(userId, "aegean_sea", id),
    outputQueryKeys.series(userId, id, { metric: "biomass" }), eventQueryKeys.feed(userId),
  ];
  keys(id).forEach((key, index) => assert.notDeepEqual(key, keys(otherId)[index]));
  assert.notDeepEqual(experimentQueryKeys.list(id, { page: 1 }), experimentQueryKeys.list(id, { page: 2 }));
  assert.notDeepEqual(outputQueryKeys.map(id, id, { metric: "biomass", species: "HKE", year: "2013" }),
    outputQueryKeys.map(id, id, { metric: "biomass", species: "HKE", year: "2014" }));
});

test("event cursor advances, uses server cadence, drains backlog, and invalidates only affected details", async () => {
  const client = createQueryClient();
  client.setQueryData(authQueryKeys.me(), { id, is_active: true, must_change_password: false });
  const original = eventService.list;
  const calls: EventFilters[] = [];
  let iteration = 0;
  eventService.list = async (filters = {}) => {
    calls.push(filters);
    return iteration++ === 0 ? feed(42) : feed(43, [event()], true);
  };
  const options = { ...experimentEventsQueryOptions(client, id), gcTime: Infinity };
  try {
    client.setQueryData(experimentQueryKeys.list(id, { page: 1 }), { items: [] });
    await client.fetchQuery(options);
    assert.equal(calls[0].after, undefined);
    assert.equal(calls[0].scope, "mine");
    assert.equal(client.getQueryState(experimentQueryKeys.list(id, { page: 1 }))?.isInvalidated, true);
    client.setQueryData(experimentQueryKeys.list(id, { page: 1 }), { items: [] });
    client.setQueryData(experimentQueryKeys.detail(id, id), experiment);
    client.setQueryData(experimentQueryKeys.detail(id, otherId), experiment);
    client.setQueryData(outputQueryKeys.metadata(id, id), {});
    assert.equal(experimentEventPollInterval(client.getQueryData(options.queryKey)), 10000);
    await client.invalidateQueries({ queryKey: options.queryKey, refetchType: "none" });
    await client.fetchQuery(options);
    assert.equal(calls[1].after, 42);
    assert.equal(client.getQueryState(experimentQueryKeys.detail(id, id))?.isInvalidated, true);
    assert.equal(client.getQueryState(experimentQueryKeys.detail(id, otherId))?.isInvalidated, false);
    assert.equal(client.getQueryState(outputQueryKeys.metadata(id, id))?.isInvalidated, true);
    assert.equal(experimentEventPollInterval(client.getQueryData(options.queryKey)), 1);
    assert.equal(eventFeedSchema.safeParse({ ...feed(43), last_id: -1 }).success, false);
  } finally {
    eventService.list = original;
    client.clear();
  }
});

test("late events and stale mutations cannot affect another user's session", async () => {
  const client = createQueryClient();
  client.setQueryData(authQueryKeys.me(), { id: otherId, is_active: true, must_change_password: false });
  client.setQueryData(experimentQueryKeys.list(id, {}), { items: [] });
  const original = eventService.list;
  eventService.list = async () => feed(43, [event()]);
  try {
    assert.equal(isCurrentSession(client, id), false);
    assert.throws(() => requireCurrentSession(client, id),
      (error: unknown) => error instanceof AppError && error.code === "session_changed");
    await client.fetchQuery(experimentEventsQueryOptions(client, id));
    assert.equal(client.getQueryState(experimentQueryKeys.list(id, {}))?.isInvalidated, false);
    await replaceSession(client, null);
    assert.equal(client.getQueryData(eventQueryKeys.feed(id)), undefined);
    assert.equal(client.getQueryData(experimentQueryKeys.list(id, {})), undefined);
  } finally {
    eventService.list = original;
    client.clear();
  }
});
