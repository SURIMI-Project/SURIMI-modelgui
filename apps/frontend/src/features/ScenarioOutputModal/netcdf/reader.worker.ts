import type { AnnualPoint, FileMetadata, OutputGrid, SpeciesSeries, Variable } from "./types";

// Read metadata and selected slices through cached HTTP byte ranges. No full-file
// fallback is permitted. The package performs synchronous range I/O in a child worker.
type Reader = {
  close: () => Promise<void>;
  getFullMetadata: () => Promise<Variable[]>;
  getVariableArray: (name: string) => Promise<ArrayLike<number | string>>;
  getSlicedVariableArray: (name: string, start: number[], count: number[]) => Promise<ArrayLike<number | string>>;
};
let dataset: Reader | undefined;
const remoteAbort = new AbortController();
const childReaders = new Set<Worker>();
let closed = false;
let received = 0;
let rangeRequests = 0;
let fileSize: number | null = null;
let metadata: FileMetadata;
let variables: Variable[] = [];
const seriesCache = new Map<string, SpeciesSeries>();
const gridCache = new Map<string, OutputGrid>();
const product = (shape: number[]) => shape.reduce((a, b) => a * b, 1);
const attr = (v: Variable, name: string) => {
  const value = v.attributes[name];
  return Array.isArray(value) || ArrayBuffer.isView(value) ? Array.from(value as ArrayLike<unknown>)[0] : value;
};
function clean(v: Variable, raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  for (const key of ["_FillValue", "missing_value"]) {
    const markers = v.attributes[key];
    if (markers !== undefined && Array.from(Array.isArray(markers) || ArrayBuffer.isView(markers) ? markers as ArrayLike<unknown> : [markers]).some(marker => Number(marker) === value)) return null;
  }
  const decoded = value * Number(attr(v, "scale_factor") ?? 1) + Number(attr(v, "add_offset") ?? 0);
  return Number.isFinite(decoded) ? decoded : null;
}
function factor(v: Variable, currency = false) {
  const unit = String(attr(v, "units") ?? "").trim().toLowerCase();
  if (currency && unit === "eur") return 1;
  if (!currency && ["kg", "kilogram", "kilograms"].includes(unit)) return 0.001;
  if (!currency && ["t", "tonne", "tonnes"].includes(unit)) return 1;
  throw new Error(`${v.name}: unsupported units '${unit}'.`);
}
async function numeric(name: string) {
  return Array.from(await dataset!.getVariableArray(name), Number);
}
async function strings(name: string) {
  const v = variables.find(item => item.name === name);
  if (!v) return [];
  const values = Array.from(await dataset!.getVariableArray(name));
  if (v.shape.length === 1) return values.map(String);
  if (v.shape.length !== 2) throw new Error(`${name}: unsupported text dimensions.`);
  const width = v.shape[1];
  const text = values.map(value => typeof value === "number" ? String.fromCharCode(value) : value).join("");
  return Array.from({ length: v.shape[0] }, (_, index) => text.slice(index * width, (index + 1) * width).replace(/\0/g, "").trim());
}
// The package's remote worker expects a Next.js base-path global. Bootstrap its
// unmodified worker against the same Vite-hosted assets already used by the lab.
// Keep this compatibility shim inside this dedicated reader worker.
function configureRemoteWorker(vendor: string, outputUrl: string) {
  const NativeWorker = globalThis.Worker;
  globalThis.Worker = class extends NativeWorker {
    private bootstrapUrl: string;
    constructor(script: string | URL, options?: WorkerOptions) {
      const target = new URL(script, self.location.href);
      const basePath = new URL(`${vendor}/earthy`).pathname;
      const bootstrap = `
        // Dynamic imports yield to the worker event loop. Hold init messages
        // until the package has installed its handler instead of dropping them.
        const earlyMessages = [];
        const holdMessage = event => { event.stopImmediatePropagation(); earlyMessages.push(event); };
        self.addEventListener('message', holdMessage);
        const reportStartupError = error => self.postMessage({ surimiWorkerError: error?.message || String(error) });
        self.addEventListener('unhandledrejection', event => { reportStartupError(event.reason); event.preventDefault(); });
        try {
        globalThis.process = { env: { NEXT_PUBLIC_BASE_PATH: ${JSON.stringify(basePath)} } };
        const NativeXHR = globalThis.XMLHttpRequest;
        const outputUrl = ${JSON.stringify(outputUrl)};
        let outputETag;
        let outputSize;
        globalThis.XMLHttpRequest = class extends NativeXHR {
          open(method, url, ...options) {
            this.outputRequest = new URL(String(url), self.location.href).href === outputUrl;
            this.outputMethod = String(method).toUpperCase();
            this.outputRange = undefined;
            super.open(method, url, ...options);
          }
          setRequestHeader(name, value) {
            if (String(name).toLowerCase() === 'range') this.outputRange = String(value);
            super.setRequestHeader(name, value);
          }
          send(body) {
            super.send(body);
            if (!this.outputRequest || (this.status !== 200 && this.status !== 206)) return;
            const size = this.response instanceof ArrayBuffer ? this.response.byteLength : 0;
            const [span, totalText] = (this.getResponseHeader('Content-Range') || '').split('/');
            const total = Number(totalText) || (this.outputMethod === 'HEAD' ? Number(this.getResponseHeader('Content-Length')) : 0);
            const tag = this.getResponseHeader('ETag');
            if ((outputETag && tag && outputETag !== tag) || (outputSize && total && outputSize !== total)) {
              throw new Error('The result file changed while being read. Close and reopen the output.');
            }
            if (tag) outputETag = tag;
            if (total) outputSize = total;
            if (this.outputRange) {
              const expected = this.outputRange.slice(6).split('-').map(Number);
              const actual = span.startsWith('bytes ') ? span.slice(6).split('-').map(Number) : [];
              if (this.status !== 206 || actual[0] !== expected[0] || actual[1] !== expected[1] || size !== expected[1] - expected[0] + 1) {
                throw new Error('The server returned an invalid or incomplete NetCDF byte range.');
              }
            }
            if (size) self.postMessage({ surimiRangeRead: true, size, total: total || null });
          }
        };
        await import(${JSON.stringify(target.href)});
        const handleMessage = self.onmessage;
        if (typeof handleMessage !== 'function') throw new Error('The NetCDF package did not install its worker handler.');
        self.removeEventListener('message', holdMessage);
        for (const event of earlyMessages) handleMessage.call(self, event);
        earlyMessages.length = 0;
        self.postMessage({ surimiWorkerReady: true });
        } catch (error) { reportStartupError(error); }
      `;
      const bootstrapUrl = URL.createObjectURL(new Blob([bootstrap], { type: "text/javascript" }));
      super(bootstrapUrl, options);
      this.bootstrapUrl = bootstrapUrl;
      childReaders.add(this);
      const fail = (message: string) => {
        self.postMessage({ type: "fatal", message });
        remoteAbort.abort(new Error(message));
        this.terminate();
      };
      this.addEventListener("error", event => { fail(event.message || "The remote NetCDF worker failed to start."); });
      this.addEventListener("messageerror", () => fail("The remote NetCDF worker returned an unreadable response."));
      this.addEventListener("message", event => {
        if (event.data?.surimiWorkerError) {
          event.stopImmediatePropagation();
          fail(`Remote NetCDF startup failed: ${event.data.surimiWorkerError}`);
          return;
        }
        if (event.data?.surimiWorkerReady) {
          event.stopImmediatePropagation();
          self.postMessage({ type: "progress", received, total: fileSize, requests: rangeRequests, message: "Reading remote NetCDF metadata…" });
          return;
        }
        if (!event.data?.surimiRangeRead) return;
        event.stopImmediatePropagation();
        received += event.data.size;
        rangeRequests++;
        fileSize = event.data.total ?? fileSize;
        self.postMessage({ type: "progress", received, total: fileSize, requests: rangeRequests, message: "Reading NetCDF ranges…" });
      });
    }
    terminate() {
      super.terminate();
      childReaders.delete(this);
      URL.revokeObjectURL(this.bootstrapUrl);
    }
  };
}
async function open(url: string, vendor: string, credentials: RequestCredentials) {
  configureRemoteWorker(vendor, url);
  self.postMessage({ type: "progress", received: 0, total: null, requests: 0, message: "Opening remote NetCDF…" });
  const { NetCDF4 } = await import(/* @vite-ignore */ `${vendor}/earthy/index.js`);
  dataset = await NetCDF4.fromUrl(url, {
    blockSize: 256 * 1024,
    cacheSize: 32 * 1024 * 1024,
    maxFullDownload: 0,
    withCredentials: credentials === "include",
    signal: remoteAbort.signal,
  });
  variables = await dataset!.getFullMetadata();
  const time = variables.find(v => v.name === "time");
  if (!time) throw new Error("The file has no time coordinate.");
  const units = String(attr(time, "units") ?? "");
  const match = /^(seconds|minutes|hours|days) since (.+)$/i.exec(units);
  if (!match) throw new Error(`Unsupported time units: ${units}`);
  const calendar = String(attr(time, "calendar") ?? "standard");
  if (!["standard", "gregorian", "proleptic_gregorian"].includes(calendar)) throw new Error(`Unsupported calendar: ${calendar}`);
  let origin = match[2].trim().replace(" ", "T");
  if (!/(Z|[+-]\d\d:?\d\d)$/.test(origin)) origin += "Z";
  const start = Date.parse(origin);
  if (!Number.isFinite(start)) throw new Error("Invalid time origin.");
  const multiplier = ({ seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 })[match[1].toLowerCase()]!;
  const dates = (await numeric("time")).map(value => new Date(start + value * multiplier).toISOString());
  const codes = await strings("species_code");
  const stages = await strings("species_life_stage");
  const lat = await numeric("lat");
  const lon = await numeric("lon");
  if (!dates.length || !codes.length || !lat.length || !lon.length || [...lat, ...lon].some(value => !Number.isFinite(value))) throw new Error("The file has incomplete coordinates.");
  metadata = {
    variables, dates, years: [...new Set(dates.map(date => Number(date.slice(0, 4))))].sort((a, b) => a - b), lat, lon,
    species: codes.map((code, index) => ({ key: JSON.stringify([code, stages[index] ?? "", index]), code, stage: stages[index] ?? "", index })),
  };
  return metadata;
}
async function slice(v: Variable, species: number, time?: number) {
  const start = v.dimensions.map(dim => dim === "species" ? species : dim === "time" && time !== undefined ? time : 0);
  const count = v.dimensions.map((dim, index) => dim === "species" || (dim === "time" && time !== undefined) ? 1 : v.shape[index]);
  if (product(count) > 250000) throw new Error(`${v.name}: requested slice exceeds the bounded reader size.`);
  const values = Array.from(await dataset!.getSlicedVariableArray(v.name, start, count));
  if (values.length !== product(count)) throw new Error(`${v.name}: slice shape mismatch.`);
  return { values, count };
}
// Sum additive fleet/market axes; preserve missing data as null, never as zero.
async function timeSeries(name: string, species: number, currency = false): Promise<(number | null)[] | null> {
  const v = variables.find(item => item.name === name);
  if (!v) return null;
  if (v.dimensions[0] !== "time" || !v.dimensions.includes("species") || v.dimensions.some(d => !["time", "species", "fleet", "market"].includes(d))) throw new Error(`${name}: unsupported series dimensions.`);
  const { values, count } = await slice(v, species);
  const stride = product(count.slice(1));
  const scale = factor(v, currency);
  return metadata.dates.map((_, time) => {
    let sum = 0;
    let found = false;
    for (let index = time * stride; index < (time + 1) * stride; index++) {
      const value = clean(v, values[index]);
      if (value !== null) { sum += value * scale; found = true; }
    }
    return found ? sum : null;
  });
}
function annual(values: (number | null)[] | null, average = false, dates?: string[]): AnnualPoint[] {
  if (!values) return [];
  const allowed = dates ? new Set(dates) : null;
  return metadata.years.filter(year => !allowed || metadata.dates.some(date => allowed.has(date) && Number(date.slice(0, 4)) === year)).map(year => {
    const available = values.filter((value, index): value is number => Number(metadata.dates[index].slice(0, 4)) === year && (!allowed || allowed.has(metadata.dates[index])) && value !== null);
    return { year, samples: available.length, value: available.length ? available.reduce((sum, value) => sum + value, 0) / (average ? available.length : 1) : null };
  });
}
async function series(species: number, dates?: string[]) {
  if (!Number.isInteger(species) || !metadata.species[species]) throw new Error("Unknown species index.");
  const key = JSON.stringify([species, dates]);
  const cached = seriesCache.get(key);
  if (cached) return cached;
  const biomass = await timeSeries("biomass_total", species);
  const catches = await timeSeries("gross_catch_total", species);
  const live = await timeSeries("live_discards_total", species);
  const dead = await timeSeries("dead_discards_total", species);
  const sales = annual(await timeSeries("sales_quantity", species), false, dates);
  const revenue = annual(await timeSeries("sales_value", species, true), false, dates);
  const discards = live && dead ? live.map((value, index) => value !== null && dead[index] !== null ? value + dead[index]! : null) : null;
  const landings = catches && discards ? catches.map((value, index) => value !== null && discards[index] !== null ? value - discards[index]! : null) : null;
  const result: SpeciesSeries = {
    biomass: annual(biomass, true, dates), catches: annual(catches, false, dates), discards: annual(discards, false, dates), landings: annual(landings, false, dates), sales,
    unitValue: sales.map(point => ({ ...point, value: point.value !== null && point.value > 0 && revenue.find(item => item.year === point.year)?.value != null ? revenue.find(item => item.year === point.year)!.value! / point.value : null })),
  };
  seriesCache.set(key, result);
  if (seriesCache.size > 8) seriesCache.delete(seriesCache.keys().next().value!);
  return result;
}
async function grid(species: number, year: number, metric: string, dates?: string[]) {
  if (!Number.isInteger(species) || !metadata.species[species] || !metadata.years.includes(year) || !["biomass", "gross_catch"].includes(metric)) throw new Error("Unsupported map selection.");
  const key = JSON.stringify([species, year, metric, dates]);
  if (gridCache.has(key)) return gridCache.get(key)!;
  const v = variables.find(item => item.name === metric);
  if (!v) throw new Error(`This file has no ${metric} grid.`);
  const expected = metric === "biomass" ? ["time", "species", "lat", "lon"] : ["time", "species", "fleet", "lat", "lon"];
  if (v.dimensions.join() !== expected.join()) throw new Error(`${metric}: unsupported map dimensions.`);
  const size = metadata.lat.length * metadata.lon.length;
  const sums = new Float64Array(size);
  const seen = new Uint32Array(size);
  const scale = factor(v);
  let samples = 0;
  const allowed = dates ? new Set(dates) : null;
  for (let time = 0; time < metadata.dates.length; time++) {
    if (Number(metadata.dates[time].slice(0, 4)) !== year || (allowed && !allowed.has(metadata.dates[time]))) continue;
    const { values } = await slice(v, species, time);
    samples++;
    for (let i = 0; i < values.length; i++) {
      const value = clean(v, values[i]);
      if (value !== null) { const cell = i % size; sums[cell] += value * scale; seen[cell]++; }
    }
  }
  const result: OutputGrid = { year, metric, samples, values: Array.from(sums, (sum, index) => seen[index] ? sum / (metric === "biomass" ? seen[index] : 1) : null) };
  gridCache.set(key, result);
  if (gridCache.size > 4) gridCache.delete(gridCache.keys().next().value!);
  return result;
}
// Serialize access to the WASM reader. Stale UI requests are ignored by request ID.
let queue = Promise.resolve();
let latestGridRequest = 0;
self.onmessage = ({ data }) => {
  if (data.action === "close") {
    closed = true;
    remoteAbort.abort();
    childReaders.forEach(worker => worker.terminate());
    seriesCache.clear();
    gridCache.clear();
    self.postMessage({ type: "closed" });
    self.close();
    return;
  }
  if (closed) return;
  if (data.action === "grid") latestGridRequest = data.requestId;
  queue = queue.then(async () => {
    try {
      if (data.action === "grid" && data.requestId !== latestGridRequest) throw new Error("Map selection changed.");
      const result = data.action === "open" ? await open(data.url, data.vendor, data.credentials)
        : data.action === "series" ? await series(data.species, data.dates)
        : data.action === "grid" ? await grid(data.species, data.year, data.metric, data.dates)
        : (() => { throw new Error("Unknown reader action."); })();
      self.postMessage({ type: "result", requestId: data.requestId, result });
    } catch (error) {
      if (data.action === "open") { remoteAbort.abort(); childReaders.forEach(worker => worker.terminate()); }
      if (closed) return;
      self.postMessage({ type: "error", requestId: data.requestId, message: error instanceof Error ? error.message : String(error) });
    }
  });
};
