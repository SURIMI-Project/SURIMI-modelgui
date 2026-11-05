import axios, { CanceledError, type AxiosInstance } from "axios";
import { z } from "zod";
import API_CONFIG from "./apiConfig";
import { readCsrfToken } from "./csrf";
import { AppError } from "./errors/appError";
import normalizeApiError from "./errors/normalizeApiError";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type BaseOptions<ResponseSchema extends z.ZodType> = {
  path: string;
  method: RequestMethod;
  responseSchema: ResponseSchema;
  signal?: AbortSignal;
  pathParams?: Record<string, string | number>;
  params?: Record<string, string | number | boolean | undefined>;
  // Public endpoints (login/providers) never trigger session renewal.
  auth?: "session" | "public";
};
type PayloadOptions<PayloadSchema extends z.ZodType> =
  | { payloadSchema: PayloadSchema; payload: z.input<PayloadSchema> }
  | { payloadSchema?: never; payload?: never };

const throwIfCancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new CanceledError("Request cancelled.");
};

// A caller can stop waiting while the shared refresh continues for other callers.
const waitForRefresh = async (refresh: Promise<void>, signal?: AbortSignal) => {
  throwIfCancelled(signal);
  if (!signal) return refresh;
  let onAbort: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(new CanceledError("Request cancelled."));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    await Promise.race([refresh, cancelled]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
};

const buildPath = (path: string, params: BaseOptions<z.ZodType>["pathParams"]) => {
  // Services use API-relative paths only; never send cookies or CSRF to a supplied URL.
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

export const createRequest = (
  client: AxiosInstance,
  getCsrfToken: () => string | undefined = readCsrfToken,
) => {
  let refreshInFlight: Promise<void> | undefined;
  let refreshVersion = 0;
  const csrfHeaders = () => {
    const token = getCsrfToken();
    return token ? { "X-CSRF-Token": token } : undefined;
  };

  const refreshSession = (): Promise<void> => {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          const response = await client.request<unknown>({
            url: "/auth/refresh",
            method: "POST",
            withCredentials: true,
            headers: csrfHeaders(),
          });
          if (response.status !== 204) {
            throw new AppError({ kind: "invalidResponse", status: response.status,
              message: "SURIMI returned an unexpected session refresh response." });
          }
          refreshVersion += 1;
        } catch (error) {
          if (axios.isCancel(error)) throw error;
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
        throw new AppError({ kind: "payloadValidation", message: "Check the request fields.",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) });
      }
      payload = parsed.data;
    }

    const send = () => client.request<unknown>({
      url: path, method, data: payload, params: options.params, signal,
      withCredentials: true,
      headers: method === "GET" ? undefined : csrfHeaders(),
    });

    try {
      let response;
      const initialRefreshVersion = refreshVersion;
      try {
        response = await send();
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 401
          || (options.auth ?? "session") !== "session"
          || normalizeApiError(error).code === "invalid_credentials") throw error;
        throwIfCancelled(signal);
        // A late 401 may belong to a request sent before another request refreshed.
        if (refreshVersion === initialRefreshVersion) {
          await waitForRefresh(refreshSession(), signal);
        }
        throwIfCancelled(signal);
        response = await send(); // One retry, with the freshly rotated CSRF cookie.
      }
      const parsed = responseSchema.safeParse(response.status === 204 ? undefined : response.data);
      if (!parsed.success) {
        throw new AppError({ kind: "invalidResponse", status: response.status,
          message: "SURIMI returned data in an unexpected format.",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) });
      }
      return parsed.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw normalizeApiError(error);
    }
  };
  return { request, refreshSession };
};

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT_MS,
  headers: { Accept: "application/json" },
});
export const { request, refreshSession } = createRequest(client);
export default request;
