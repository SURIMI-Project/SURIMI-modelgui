import { passwordChangeFormSchema } from "../src/features/auth/passwordChangeForm";
import { getSsoLoginPath } from "../src/features/auth/ssoLoginPath";
import { getScenarioAvailability } from "../src/features/scenarios/scenarioAvailability";
import { QueryObserver } from "@tanstack/react-query";
import { getReturnPath } from "../src/features/auth/returnPath";
import assert from "node:assert/strict";
import { test } from "node:test";
import axios, { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { z } from "zod";
import { createRequest } from "../src/network/request";
import { AppError } from "../src/network/errors/appError";
import normalizeApiError from "../src/network/errors/normalizeApiError";
import { authProvidersSchema, loginPayloadSchema, userSchema } from "../src/network/services/auth/authSchemas";
import authService from "../src/network/services/auth/authService";
import { scenarioContractSchema, scenariosSchema } from "../src/network/services/scenarios/scenarioSchemas";
import { createQueryClient } from "../src/serverState/queryClient";
import { authQueryKeys } from "../src/serverState/auth/authQueryKeys";
import { replaceSession } from "../src/serverState/auth/sessionCache";

const user = {
  id: "c31e593b-b48c-4d5c-917c-6b709765ac3a", email: "member@example.org",
  username: "member", first_name: null, last_name: null, display_name: "Member",
  account: "sso", role: "member", role_source: "idp", is_active: true,
  must_change_password: false, has_password: false, last_login_at: null,
  login_count: 1, created_at: "2026-11-05T10:00:00+00:00",
};
const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
const response = (status: number, data: unknown, request = config, headers = {}): AxiosResponse => ({
  status, data, config: request, headers, statusText: String(status),
});
const rejected = (status: number, data: unknown, request = config, headers = {}): never => {
  throw new AxiosError("Request failed", undefined, request, undefined, response(status, data, request, headers));
};
const harness = (
  handler: (request: InternalAxiosRequestConfig) => AxiosResponse | Promise<AxiosResponse>,
  csrf = () => "csrf-before",
) => {
  const calls: InternalAxiosRequestConfig[] = [];
  const client = axios.create({ adapter: async (request) => {
    calls.push(request);
    return handler(request);
  } });
  return { ...createRequest(client, csrf), calls };
};
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const objectSchema = z.object({ ok: z.boolean() });
const readOptions = { path: "/scenarios", method: "GET" as const, responseSchema: objectSchema };
const assertKind = (kind: string, status?: number) => (error: unknown) => {
  assert.ok(error instanceof AppError);
  assert.equal(error.kind, kind);
  if (status !== undefined) assert.equal(error.status, status);
  return true;
};

// Compile-time service boundary: never execute these invalid calls.
const assertPayloadTypes = () => {
  // @ts-expect-error password must be a string
  void authService.login({ login: "member", password: 123 });
  // @ts-expect-error a password is required
  void authService.login({ login: "member" });
};
void assertPayloadTypes;

test("typed payload is validated before HTTP and validated response is returned", async () => {
  const api = harness((request) => response(200, { ok: true, extra: "ignored" }, request));
  const result = await api.request({ ...readOptions, method: "POST", payloadSchema: loginPayloadSchema,
    payload: { login: "member", password: "secret" } });
  assert.deepEqual(result, { ok: true });
  assert.equal(api.calls[0].withCredentials, true);
  assert.equal(api.calls[0].headers.get("X-CSRF-Token"), "csrf-before");
  assert.deepEqual(JSON.parse(api.calls[0].data), { login: "member", password: "secret" });
});

test("invalid payload never leaves browser and does not expose password", async () => {
  const api = harness(() => response(200, { ok: true }));
  await assert.rejects(api.request({ ...readOptions, method: "POST", payloadSchema: loginPayloadSchema,
    payload: { login: "", password: "do-not-leak" } }), (error) => {
    assertKind("payloadValidation")(error);
    assert.ok(!JSON.stringify(error).includes("do-not-leak"));
    return true;
  });
  assert.equal(api.calls.length, 0);
});

test("204 has undefined body; unexpected successful data is invalidResponse", async () => {
  const empty = harness((request) => response(204, "", request));
  assert.equal(await empty.request({ ...readOptions, method: "POST", responseSchema: z.void() }), undefined);
  const invalid = harness((request) => response(200, "<html>proxy page</html>", request));
  await assert.rejects(invalid.request(readOptions), assertKind("invalidResponse", 200));
});

test("SURIMI errors preserve stable code, details, request ID and retry header", () => {
  let raw: unknown;
  try { rejected(429, { error: { code: "too_many_attempts", message: "Try later",
    details: { field: "login" }, request_id: "request-42" } }, config, { "retry-after": "60" }); }
  catch (error) { raw = error; }
  const error = normalizeApiError(raw);
  assert.equal(error.kind, "rateLimited");
  assert.equal(error.code, "too_many_attempts");
  assert.equal(error.requestId, "request-42");
  assert.equal(error.retryAfter, "60");
  assert.deepEqual(error.details, { field: "login" });
});

test("FastAPI validation and string details are handled without retaining raw input", () => {
  for (const detail of [[{ loc: ["body", "login"], msg: "Required", input: "do-not-leak" }], "Not found"]) {
    let raw: unknown;
    try { rejected(422, { detail }); } catch (error) { raw = error; }
    const error = normalizeApiError(raw);
    assert.equal(error.kind, "validation");
    assert.ok(!JSON.stringify(error).includes("do-not-leak"));
    if (Array.isArray(detail)) assert.equal(error.issues?.[0].path, "body.login");
    else assert.equal(error.message, "Not found");
  }
});

test("non-JSON server errors and network errors normalize safely", () => {
  let raw: unknown;
  try { rejected(502, "<html>Bad gateway</html>", config, { "x-request-id": "proxy-1" }); }
  catch (error) { raw = error; }
  const error = normalizeApiError(raw);
  assert.equal(error.kind, "server");
  assert.equal(error.requestId, "proxy-1");
  assert.ok(!error.message.includes("<html>"));
  assert.equal(normalizeApiError(new AxiosError("network")).kind, "network");
  assert.equal(normalizeApiError(new Error("secret internal text")).message, "An unexpected request error occurred.");
});

test("login, password and 403 failures never refresh or redirect", async () => {
  for (const auth of ["public", "session"] as const) {
    const api = harness((request) => rejected(401, { error: { code: "invalid_credentials", message: "Wrong password" } }, request));
    await assert.rejects(api.request({ ...readOptions, auth }), assertKind("unauthorized", 401));
    assert.equal(api.calls.length, 1);
  }
  const forbidden = harness((request) => rejected(403, { error: { code: "password_change_required", message: "Change password" } }, request));
  await assert.rejects(forbidden.request(readOptions), assertKind("forbidden", 403));
  assert.equal(forbidden.calls.length, 1);
});

test("parallel expired requests share one refresh and retry with the new CSRF cookie", async () => {
  const release = deferred<void>();
  const started = deferred<void>();
  let fresh = false;
  const api = harness(async (request) => {
    if (request.url === "/auth/refresh") {
      started.resolve();
      await release.promise;
      fresh = true;
      return response(204, "", request);
    }
    if (!fresh) return rejected(401, { error: { code: "not_authenticated", message: "Expired" } }, request);
    assert.equal(request.headers.get("X-CSRF-Token"), "csrf-after");
    return response(200, { ok: true }, request);
  }, () => fresh ? "csrf-after" : "csrf-before");
  const a = api.request({ ...readOptions, method: "POST" });
  const b = api.request({ ...readOptions, method: "POST" });
  await started.promise;
  release.resolve();
  await Promise.all([a, b]);
  assert.equal(api.calls.filter((call) => call.url === "/auth/refresh").length, 1);
  assert.equal(api.calls.length, 5);
});

test("a late 401 uses an already-completed refresh instead of rotating again", async () => {
  const late = deferred<void>();
  let fresh = false;
  const api = harness(async (request) => {
    if (request.url === "/auth/refresh") { fresh = true; return response(204, "", request); }
    if (request.url === "/late" && !fresh) {
      await late.promise;
      return rejected(401, {}, request);
    }
    return fresh ? response(200, { ok: true }, request) : rejected(401, {}, request);
  });
  const b = api.request({ ...readOptions, path: "/late" });
  await api.request(readOptions);
  late.resolve();
  await b;
  assert.equal(api.calls.filter((call) => call.url === "/auth/refresh").length, 1);
});

test("failed refresh stops without loops; a second 401 after refresh is not replayed", async () => {
  const expired = harness((request) => rejected(401, { error: { code: "not_authenticated", message: "Sign in" } }, request));
  await assert.rejects(expired.request(readOptions), assertKind("unauthorized", 401));
  assert.equal(expired.calls.length, 2);
  const stillExpired = harness((request) => request.url === "/auth/refresh"
    ? response(204, "", request) : rejected(401, {}, request));
  await assert.rejects(stillExpired.request(readOptions), assertKind("unauthorized", 401));
  assert.equal(stillExpired.calls.length, 3);
});

test("malformed refresh response is not treated as renewed authentication", async () => {
  const api = harness((request) => request.url === "/auth/refresh"
    ? response(200, { success: true }, request) : rejected(401, {}, request));
  await assert.rejects(api.request(readOptions), assertKind("invalidResponse", 200));
  assert.equal(api.calls.length, 2);
});

test("cancelling one waiter leaves the shared refresh and another request running", async () => {
  const release = deferred<void>();
  const started = deferred<void>();
  let fresh = false;
  const api = harness(async (request) => {
    if (request.url === "/auth/refresh") {
      started.resolve();
      await release.promise;
      fresh = true;
      return response(204, "", request);
    }
    return fresh ? response(200, { ok: true }, request) : rejected(401, {}, request);
  });
  const abort = new AbortController();
  const a = api.request({ ...readOptions, signal: abort.signal });
  const b = api.request(readOptions);
  await started.promise;
  abort.abort();
  await assert.rejects(a, (error) => axios.isCancel(error));
  release.resolve();
  assert.deepEqual(await b, { ok: true });
  assert.equal(api.calls.filter((call) => call.url === "/auth/refresh").length, 1);
  assert.equal(api.calls.find((call) => call.url === "/auth/refresh")?.signal, undefined);
});

test("already-aborted requests perform no HTTP; writes do not retry network failures", async () => {
  const abort = new AbortController();
  abort.abort();
  const api = harness(() => { throw new AxiosError("network failure"); });
  await assert.rejects(api.request({ ...readOptions, signal: abort.signal }), (error) => axios.isCancel(error));
  assert.equal(api.calls.length, 0);
  await assert.rejects(api.request({ ...readOptions, method: "POST" }), assertKind("network"));
  assert.equal(api.calls.length, 1);
});

test("path parameters are encoded; missing parameters and external URLs fail locally", async () => {
  const api = harness((request) => response(200, { ok: true }, request));
  await api.request({ ...readOptions, path: "/scenarios/{name}/contract", pathParams: { name: "a/b?x=1" } });
  assert.equal(api.calls[0].url, "/scenarios/a%2Fb%3Fx%3D1/contract");
  await assert.rejects(api.request({ ...readOptions, path: "/{missing}" }), assertKind("payloadValidation"));
  await assert.rejects(api.request({ ...readOptions, path: "https://other.example.org/" }), assertKind("payloadValidation"));
  assert.equal(api.calls.length, 1);
});

test("schemas match SURIMI user, provider and catalogue shapes, not gateway claims", () => {
  assert.equal(userSchema.parse(user).first_name, null);
  assert.equal(userSchema.safeParse({ ...user, role: "user" }).success, false);
  assert.equal(userSchema.safeParse({ authenticated: true, user: {} }).success, false);
  assert.equal(authProvidersSchema.parse([{ key: "keycloak", display_name: "Keycloak", login_url: "/api/v1/auth/sso/keycloak/login" }]).length, 1);
  assert.equal(scenariosSchema.parse({ scenarios: [{ name: "northwestern_med" }] }).scenarios[0].name, "northwestern_med");
  assert.deepEqual(scenarioContractSchema.parse({ scenario_name: "northwestern_med", simulation: { unknown_nested: [1] } }).simulation, { unknown_nested: [1] });
});

test("account replacement cancels/removes old queries before setting the new user", async () => {
  const client = createQueryClient();
  try {
    client.setQueryData(["scenarios", "previous-user", "list"], { private: true });
    client.setQueryData(authQueryKeys.me(), userSchema.parse(user));
    const nextUser = userSchema.parse({ ...user, id: "f278cc21-eac7-43f6-835d-b7ea830b5592" });
    await replaceSession(client, nextUser);
    assert.equal(client.getQueryData(["scenarios", "previous-user", "list"]), undefined);
    assert.deepEqual(client.getQueryData(authQueryKeys.me()), nextUser);
    await replaceSession(client, null);
    assert.equal(client.getQueryData(authQueryKeys.me()), null);
  } finally { client.clear(); }
});

test("terminal session expiry clears protected cache; wrong login does not", async () => {
  const client = createQueryClient();
  try {
    client.setQueryData(authQueryKeys.me(), userSchema.parse(user));
    client.setQueryData(["private-data"], { private: true });
    await assert.rejects(client.fetchQuery({ queryKey: ["business"], queryFn: () => {
      throw new AppError({ kind: "unauthorized", status: 401, code: "not_authenticated", message: "Sign in" });
    } }));
    assert.equal(client.getQueryData(["private-data"]), undefined);
    assert.equal(client.getQueryData(authQueryKeys.me()), null);
    client.setQueryData(authQueryKeys.me(), userSchema.parse(user));
    client.setQueryData(["private-data"], { private: true });
    const mutation = client.getMutationCache().build(client, { mutationFn: async () => {
      throw new AppError({ kind: "unauthorized", status: 401, code: "invalid_credentials", message: "Wrong password" });
    } });
    await assert.rejects(mutation.execute(undefined));
    assert.deepEqual(client.getQueryData(["private-data"]), { private: true });
    assert.equal(client.getQueryData<{ id: string }>(authQueryKeys.me())?.id, user.id);
  } finally { client.clear(); }
});


test("a late current-user response cannot restore an expired cached session", async () => {
  const client = createQueryClient();
  const release = deferred<void>();
  try {
    client.setQueryData(authQueryKeys.me(), userSchema.parse(user));
    const pendingUser = client.fetchQuery({ queryKey: authQueryKeys.me(), staleTime: 0,
      queryFn: async () => { await release.promise; return userSchema.parse(user); } });
    const cancelledUser = pendingUser.catch(() => null);
    await assert.rejects(client.fetchQuery({ queryKey: ["business"], queryFn: () => {
      throw new AppError({ kind: "unauthorized", status: 401, code: "not_authenticated", message: "Sign in" });
    } }));
    release.resolve();
    await cancelledUser;
    assert.equal(client.getQueryData(authQueryKeys.me()), null);
  } finally { release.resolve(); client.clear(); }
});


test("session changes notify mounted user observers immediately", async () => {
  const client = createQueryClient();
  client.setQueryData(authQueryKeys.me(), userSchema.parse(user));
  const observer = new QueryObserver(client, { queryKey: authQueryKeys.me(), enabled: false });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await replaceSession(client, null);
    assert.equal(observer.getCurrentResult().data, null);
    const next = userSchema.parse({ ...user, id: "f278cc21-eac7-43f6-835d-b7ea830b5592" });
    await replaceSession(client, next);
    assert.deepEqual(observer.getCurrentResult().data, next);
  } finally { unsubscribe(); client.clear(); }
});

test("login return paths preserve internal links and reject external URLs and loops", () => {
  assert.equal(getReturnPath("/scenario-runs/aegean-sea?run=demo#report"), "/scenario-runs/aegean-sea?run=demo#report");
  assert.equal(getReturnPath("/netcdf-lab"), "/netcdf-lab");
  for (const value of [null, "", "https://other.example.org", "//other.example.org", "/\\other.example.org", "/login", "/login?next=/", "/%6cogin", "/%2f%2fother.example.org", "/bad%encoding"]) {
    assert.equal(getReturnPath(value), "/", String(value));
  }
});


test("password confirmation validates locally and preserves the service payload contract", () => {
  const values = { current_password: "temporary-password", new_password: "A-new-long-passphrase", confirm_password: "A-new-long-passphrase" };
  assert.equal(passwordChangeFormSchema.safeParse(values).success, true);
  assert.equal(passwordChangeFormSchema.safeParse({ ...values, confirm_password: "different-password" }).success, false);
  assert.equal(passwordChangeFormSchema.safeParse({ ...values, new_password: "short" }).success, false);
  assert.equal(passwordChangeFormSchema.safeParse({ ...values, new_password: "x".repeat(257) }).success, false);
  assert.equal(getReturnPath("/change-password?next=/"), "/");
});

test("SSO navigation uses only the backend's local provider route and a safe next", () => {
  assert.equal(getSsoLoginPath("/api/v1/auth/sso/keycloak/login", "/scenario-runs/aegean-sea"), "/api/v1/auth/sso/keycloak/login?next=%2Fscenario-runs%2Faegean-sea");
  assert.equal(getSsoLoginPath("/api/v1/auth/sso/keycloak/login", "https://outside.example.org"), "/api/v1/auth/sso/keycloak/login?next=%2F");
  for (const path of ["https://outside.example.org/api/v1/auth/sso/keycloak/login", "//outside.example.org/login", "/api/v1/auth/me", "/api/v1/auth/sso/../login"]) {
    assert.throws(() => getSsoLoginPath(path, "/"));
  }
});

test("availability distinguishes unknown/error from a successful unavailable result", () => {
  const list = { scenarios: [{ name: "anchovy_bay" }] };
  assert.equal(getScenarioAvailability("anchovy_bay", undefined, false), "loading");
  assert.equal(getScenarioAvailability("anchovy_bay", undefined, true), "error");
  assert.equal(getScenarioAvailability("anchovy_bay", list, true), "error");
  assert.equal(getScenarioAvailability("anchovy_bay", list, false), "available");
  assert.equal(getScenarioAvailability("aegean_sea", list, false), "unavailable");
  assert.equal(getScenarioAvailability("anchovy_bay", { scenarios: [] }, false), "unavailable");
});
