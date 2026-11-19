export type AppErrorKind =
  | "payloadValidation"
  | "invalidResponse"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "rateLimited"
  | "network"
  | "server"
  | "unknown";

export type ValidationIssue = {
  path: string;
  message: string;
};

type AppErrorOptions = {
  kind: AppErrorKind;
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
  retryAfter?: string;
  issues?: ValidationIssue[];
};

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;
  readonly retryAfter?: string;
  readonly issues?: ValidationIssue[];

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
    this.retryAfter = options.retryAfter;
    this.issues = options.issues;
  }
}
