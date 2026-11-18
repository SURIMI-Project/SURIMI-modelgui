import type { ReaderResult } from "../../../features/ScenarioOutputModal/netcdf/types";

export type DownloadProgress = { received: number; total: number | null; message: string };
export class NetcdfReader {
  private worker: Worker;
  private sequence = 0;
  private closed = false;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private pending = new Map<number, { resolve: (result: ReaderResult) => void; reject: (error: Error) => void }>();
  constructor(progress: (progress: DownloadProgress) => void) {
    this.worker = new Worker(new URL("../../../features/ScenarioOutputModal/netcdf/reader.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = ({ data }) => {
      if (data.type === "closed") { this.worker.terminate(); return; }
      if (this.closed) return;
      if (data.type === "fatal") { this.fail(new Error(data.message)); this.close(); return; }
      if (data.type === "progress") { this.watchActivity(); progress(data); return; }
      const request = this.pending.get(data.requestId);
      if (!request) return;
      this.pending.delete(data.requestId);
      this.watchActivity();
      if (data.type === "error") request.reject(new Error(data.message));
      else request.resolve(data.result);
    };
    this.worker.onerror = event => { this.fail(new Error(event.message || "The NetCDF reader stopped. Try opening the dashboard again.")); this.close(); };
    this.worker.onmessageerror = () => { this.fail(new Error("The NetCDF reader returned an unreadable response.")); this.close(); };
  }
  request<T extends ReaderResult>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    if (this.closed) return Promise.reject(new Error("Reader closed."));
    const requestId = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve: result => resolve(result as T), reject });
      this.watchActivity();
      this.worker.postMessage({ action, requestId, ...params });
    });
  }
  private watchActivity() {
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    if (!this.pending.size || this.closed) return;
    this.idleTimer = setTimeout(() => {
      this.fail(new Error("The remote NetCDF reader has not responded for 45 seconds. Check your connection and try again."));
      this.close();
    }, 45_000);
  }
  private fail(error: Error) {
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    this.pending.forEach(request => request.reject(error));
    this.pending.clear();
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.fail(new Error("Reader closed."));
    this.worker.postMessage({ action: "close" });
    // The close acknowledgement lets the parent abort the package's child worker.
    window.setTimeout(() => this.worker.terminate(), 1000);
  }
}
