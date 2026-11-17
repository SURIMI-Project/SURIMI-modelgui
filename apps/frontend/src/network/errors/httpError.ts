// Internal transport error. API consumers receive a normalized AppError instead.
export class HttpError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly headers: Headers;

  constructor(response: Response, data: unknown) {
    super(`HTTP request failed (${response.status}).`);
    this.name = "HttpError";
    this.status = response.status;
    this.data = data;
    this.headers = response.headers;
  }
}
