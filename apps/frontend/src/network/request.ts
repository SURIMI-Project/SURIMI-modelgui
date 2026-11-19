import { z } from "zod";
import API_CONFIG from "./apiConfig";
import { readCsrfToken } from "./csrf";
import { AppError } from "./errors/appError";
import { HttpError } from "./errors/httpError";
import normalizeApiError from "./errors/normalizeApiError";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type QueryParams = Record<string, string | number | boolean | undefined>;
type BaseOptions<ResponseSchema extends z.ZodType> = {
  path: string;
  method: RequestMethod;
  responseSchema: ResponseSchema;
  signal?: AbortSignal;
  pathParams?: Record<string, string | number>;
  params?: QueryParams;
  // Public endpoints (login/providers) never trigger session renewal.
  auth?: "session" | "public";
};
type PayloadOptions<PayloadSchema extends z.ZodType> =
  | { payloadSchema: PayloadSchema; payload: z.input<PayloadSchema> }
  | { payloadSchema?: never; payload?: never };
type SendOptions = {
  method: RequestMethod;
  payload?: unknown;
  params?: QueryParams;
  signal?: AbortSignal;
};

const cancellation = () => new DOMException("Request cancelled.", "AbortError");
const isCancelled = (error: unknown) => error instanceof Error && error.name === "AbortError";
const throwIfCancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw cancellation();
};

// Cancelling one caller does not cancel the refresh shared by other callers.
const waitForRefresh = async (refresh: Promise<void>, signal?: AbortSignal) => {
  throwIfCancelled(signal);
  if (!signal) return refresh;
  let onAbort: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(cancellation());
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    await Promise.race([refresh, cancelled]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
};

const buildPath = (path: string, params: BaseOptions<z.ZodType>["pathParams"]) => {
  // Never send cookies or CSRF to a URL supplied through a service argument.
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    throw new AppError({ kind: "payloadValidation", message: "Expected an API-relative path." });
  }
  return path.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new AppError({ kind: "payloadValidation", message: `Missing path parameter: ${name}.` });
    }
    return encodeURIComponent(String(value));
  });
};

const buildUrl = (path: string, params?: QueryParams) => {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const suffix = query.size > 0 ? `${path.includes("?") ? "&" : "?"}${query}` : "";
  return `${API_CONFIG.BASE_URL}${path}${suffix}`;
};

// Read each response body once. Non-JSON errors still retain their HTTP status.
const responseData = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const createRequest = (
  fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init),
  getCsrfToken: () => string | undefined = readCsrfToken,
) => {
  let refreshInFlight: Promise<void> | undefined;
  let refreshVersion = 0;

  const send = async (path: string, { method, payload, params, signal }: SendOptions) => {
    throwIfCancelled(signal);
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, API_CONFIG.TIMEOUT_MS);
    try {
      const headers = new Headers({ Accept: "application/json" });
      if (method !== "GET") {
        const csrf = getCsrfToken();
        if (csrf) headers.set("X-CSRF-Token", csrf);
      }
      const body = payload === undefined ? undefined : JSON.stringify(payload);
      if (body !== undefined) headers.set("Content-Type", "application/json");
      const response = await fetcher(buildUrl(path, params), {
        method, headers, body, signal: controller.signal, credentials: "include",
        // REST endpoints must not forward authenticated requests via redirects.
        redirect: "error",
      });
      const data = await responseData(response);
      throwIfCancelled(signal);
      if (!response.ok) throw new HttpError(response, data);
      return { status: response.status, data };
    } catch (error) {
      throwIfCancelled(signal);
      if (timedOut) {
        throw new AppError({ kind: "network", message: "The SURIMI request timed out. Please try again." });
      }
      if (error instanceof HttpError || error instanceof AppError || isCancelled(error)) throw error;
      throw new AppError({ kind: "network", message: "Unable to reach SURIMI. Please try again." });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  };

  const refreshSession = (): Promise<void> => {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          const response = await send("/auth/refresh", { method: "POST" });
          if (response.status !== 204) {
            throw new AppError({
              kind: "invalidResponse", status: response.status,
              message: "SURIMI returned an unexpected session refresh response.",
            });
          }
          refreshVersion += 1;
        } catch (error) {
          if (isCancelled(error)) throw error;
          throw normalizeApiError(error);
        } finally {
          refreshInFlight = undefined;
        }
      })();
    }
    return refreshInFlight;
  };

  const request = async <ResponseSchema extends z.ZodType, PayloadSchema extends z.ZodType>(
    options: BaseOptions<ResponseSchema> & PayloadOptions<PayloadSchema>,
  ): Promise<z.output<ResponseSchema>> => {
    const { signal, method, responseSchema } = options;
    throwIfCancelled(signal);
    const path = buildPath(options.path, options.pathParams);
    let payload: unknown;
    if (options.payloadSchema) {
      const parsed = options.payloadSchema.safeParse(options.payload);
      if (!parsed.success) {
        throw new AppError({
          kind: "payloadValidation", message: "Check the request fields.",
          issues: parsed.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })),
        });
      }
      payload = parsed.data;
    }

    const sendRequest = () => send(path, { method, payload, params: options.params, signal });
    try {
      let response;
      const initialRefreshVersion = refreshVersion;
      try {
        response = await sendRequest();
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 401
          || (options.auth ?? "session") !== "session"
          || normalizeApiError(error).code === "invalid_credentials") throw error;
        throwIfCancelled(signal);
        // A late 401 may come from a request sent before another request refreshed.
        if (refreshVersion === initialRefreshVersion) {
          await waitForRefresh(refreshSession(), signal);
        }
        throwIfCancelled(signal);
        response = await sendRequest(); // One retry, using the rotated CSRF cookie.
      }
      const parsed = responseSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new AppError({
          kind: "invalidResponse", status: response.status,
          message: "SURIMI returned data in an unexpected format.",
          issues: parsed.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })),
        });
      }
      return parsed.data;
    } catch (error) {
      if (isCancelled(error)) throw error;
      throw normalizeApiError(error);
    }
  };
  return { request, refreshSession };
};

export const { request, refreshSession } = createRequest();
export default request;
