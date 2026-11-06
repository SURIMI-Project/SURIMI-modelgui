import axios from "axios";
import { z } from "zod";
import { AppError, type AppErrorKind } from "./appError";

const applicationErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    request_id: z.string().optional(),
  }),
});
const frameworkErrorSchema = z.object({
  detail: z.union([
    z.string(),
    z.array(z.object({
      msg: z.string(),
      loc: z.array(z.union([z.string(), z.number()])).optional(),
    })),
  ]),
});
const kindByStatus: Record<number, AppErrorKind> = {
  400: "validation",
  401: "unauthorized",
  403: "forbidden",
  404: "notFound",
  409: "conflict",
  422: "validation",
  429: "rateLimited",
};

const normalizeApiError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  if (axios.isAxiosError<unknown>(error)) {
    const response = error.response;
    if (!response) {
      return new AppError({ kind: "network", message: "Unable to reach SURIMI. Please try again." });
    }
    const application = applicationErrorSchema.safeParse(response.data);
    const framework = frameworkErrorSchema.safeParse(response.data);
    const body = application.success ? application.data.error : undefined;
    const detail = framework.success ? framework.data.detail : undefined;
    const issues = Array.isArray(detail)
      ? detail.map((issue) => ({ path: issue.loc?.join(".") ?? "", message: issue.msg }))
      : undefined;
    const headerRequestId: unknown = response.headers["x-request-id"];
    const retryAfter: unknown = response.headers["retry-after"];
    return new AppError({
      kind: kindByStatus[response.status] ?? (response.status >= 500 ? "server" : "unknown"),
      status: response.status,
      message: body?.message ?? (typeof detail === "string" ? detail : undefined)
        ?? issues?.map((issue) => issue.message).join(", ")
        ?? `SURIMI request failed (${response.status}).`,
      code: body?.code,
      details: body?.details,
      requestId: body?.request_id ?? (typeof headerRequestId === "string" ? headerRequestId : undefined),
      retryAfter: typeof retryAfter === "string" ? retryAfter : undefined,
      issues,
    });
  }
  // Do not expose arbitrary exception messages: they can contain request bodies.
  return new AppError({ kind: "unknown", message: "An unexpected request error occurred." });
};

export default normalizeApiError;
