/* EarthyScience only. All decoding stays in this worker. */
let dataset;
let variables = [];
let dimensions = [];
let lookups = {};
const MAX_VALUES = 10000;
const product = shape => shape.reduce((a, b) => a * b, 1);

function jsonValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  if (Array.isArray(value) || ArrayBuffer.isView(value)) return Array.from(value, jsonValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonValue(item)]));
  return value;
}

function reshape(values, shape) {
  if (!shape.length) return values[0];
  let offset = 0;
  function nest(axis) {
    return Array.from({ length: shape[axis] }, () => axis === shape.length - 1 ? values[offset++] : nest(axis + 1));
  }
  return nest(0);
}

function unpack(values, shape) {
  let flat = Array.from(values);
  const size = product(shape);
  // NC_CHAR may be returned as a single joined string rather than characters.
  if (flat.length !== size && flat.every(value => typeof value === 'string')) {
    const text = flat.join('');
    if (text.length === size) flat = text.split('');
  }
  if (flat.length !== size) throw new Error(`Reader returned ${flat.length} values for a slice requiring ${size}.`);
  return flat;
}

async function downloadFile(url) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an HTTP or HTTPS file URL.');
  const started = performance.now();
  const response = await fetch(parsed.href, { credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error(`File download failed: HTTP ${response.status} ${response.statusText}`);
  if (!response.body) throw new Error('This response has no readable body.');
  const total = Number(response.headers.get('content-length')) || null;
  const stream = response.body.getReader();
  const chunks = [];
  let received = 0;
  let lastUpdate = 0;
  while (true) {
    const { value, done } = await stream.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (performance.now() - lastUpdate > 120) {
      self.postMessage({ type: 'download-progress', received, total, elapsedMs: performance.now() - started });
      lastUpdate = performance.now();
    }
  }
  const name = decodeURIComponent(parsed.pathname.split('/').pop() || 'download.nc');
  const file = new File(chunks, name, { type: 'application/x-netcdf' });
  chunks.length = 0;
  self.postMessage({ type: 'downloaded', received, total: received, filename: name, elapsedMs: performance.now() - started });
  return file;
}

function decodeText(values, variable) {
  if (variable.shape.length === 1) return Array.from(values);
  if (variable.shape.length === 2) {
    const flat = unpack(values, variable.shape);
    const width = variable.shape[1];
    return Array.from({ length: variable.shape[0] }, (_, i) => flat.slice(i * width, (i + 1) * width).map(v => typeof v === 'number' ? String.fromCharCode(v) : v).join('').replace(/\0/g, ''));
  }
  return Array.from(values);
}

async function openFile(file, vendor) {
  self.window = self; // The package checks this browser global; no DOM is used.
  const { NetCDF4 } = await import(`${vendor}/earthy/index.js`);
  dataset = await NetCDF4.fromBlob(file, 'r', { wasmPath: `${vendor}/earthy/netcdf4-wasm.wasm` });
  dimensions = Object.entries(await dataset.getDims()).map(([name, d]) => ({ name, size: d.size }));
  variables = (await dataset.getFullMetadata()).map(v => ({ name: v.name, type: v.dtype, dimensions: v.dimensions, shape: v.shape, attributes: jsonValue(v.attributes) }));
  lookups = {};
  const warnings = [];
  for (const name of ['time', 'lat', 'lon', 'species_code', 'species_life_stage', 'fleet_country_code', 'fleet_gear_code', 'market_code', 'price_category_code']) {
    const variable = variables.find(v => v.name === name);
    if (!variable || product(variable.shape) > MAX_VALUES) continue;
    try {
      const values = await dataset.getVariableArray(name);
      lookups[name] = jsonValue(decodeText(values, variable));
    } catch (error) { warnings.push(`${name}: ${error.message}`); }
  }
  const globalAttributes = jsonValue(await dataset.getGlobalAttributes());
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const format = signature[0] === 137 ? 'NetCDF-4 / HDF5' : signature[3] === 1 ? 'NetCDF-3 classic' : 'NetCDF CDF format';
  return { filename: file.name, sizeBytes: file.size, format, dimensions, variables, lookups, globalAttributes, warnings, maxValues: MAX_VALUES };
}

function selectedCoordinates(variable, start, count) {
  const sources = { time: ['time'], species: ['species_code', 'species_life_stage'], fleet: ['fleet_country_code', 'fleet_gear_code'], market: ['market_code'], category: ['price_category_code'], lat: ['lat'], lon: ['lon'] };
  return Object.fromEntries(variable.dimensions.map((name, axis) => [name, {
    indices: Array.from({ length: count[axis] }, (_, i) => start[axis] + i),
    ...Object.fromEntries((sources[name] || []).filter(key => lookups[key]).map(key => [key, lookups[key].slice(start[axis], start[axis] + count[axis])]))
  }]));
}

async function readVariable(name, start, count) {
  const variable = variables.find(v => v.name === name);
  if (!variable) throw new Error(`Unknown variable: ${name}`);
  if (!Array.isArray(start) || !Array.isArray(count) || start.length !== variable.shape.length || count.length !== variable.shape.length) throw new Error('One start and count is required for each dimension.');
  for (let axis = 0; axis < variable.shape.length; axis++) {
    if (!Number.isInteger(start[axis]) || !Number.isInteger(count[axis]) || start[axis] < 0 || count[axis] < 1 || start[axis] + count[axis] > variable.shape[axis]) throw new Error(`Invalid range for ${variable.dimensions[axis]}.`);
  }
  const size = product(count);
  if (size > MAX_VALUES) throw new Error(`Select at most ${MAX_VALUES.toLocaleString()} values per view; this selection contains ${size.toLocaleString()}.`);
  const complete = variable.shape.every((length, i) => start[i] === 0 && count[i] === length);
  let flat;
  let readMethod;
  if (complete) {
    flat = unpack(await dataset.getVariableArray(name), count);
    readMethod = 'Complete variable';
  } else {
    try {
      flat = unpack(await dataset.getSlicedVariableArray(name, start, count), count);
      readMethod = 'NetCDF slice';
    } catch (error) {
      // Some small NC_CHAR variables cannot use the package's sliced read API.
      // Stay with EarthyScience and bound the fallback to MAX_VALUES as well.
      if (product(variable.shape) > MAX_VALUES) throw error;
      const full = unpack(await dataset.getVariableArray(name), variable.shape);
      const sourceStrides = variable.shape.map((_, i) => product(variable.shape.slice(i + 1)));
      const targetStrides = count.map((_, i) => product(count.slice(i + 1)));
      flat = Array.from({ length: size }, (_, index) => full[start.reduce((offset, position, axis) => offset + (position + Math.floor(index / targetStrides[axis]) % count[axis]) * sourceStrides[axis], 0)]);
      readMethod = 'Small variable read in full; selected values extracted by explorer';
    }
  }
  return {
    variable: name,
    dataType: variable.type,
    readMethod,
    attributes: variable.attributes,
    dimensionOrder: variable.dimensions,
    fullShape: variable.shape,
    selection: Object.fromEntries(variable.dimensions.map((dimension, i) => [dimension, { start: start[i], count: count[i] }])),
    sliceShape: count,
    returnedValues: size,
    totalValues: product(variable.shape),
    completeVariable: complete,
    coordinates: selectedCoordinates(variable, start, count),
    data: reshape(jsonValue(flat), count),
    jsonEncoding: 'NaN and infinities are strings because JSON has no non-finite numbers. Big integers are decimal strings. Fill markers and original units are preserved; no aggregation, scale/offset, or unit conversion is applied.'
  };
}

self.onmessage = async ({ data }) => {
  let started = performance.now();
  try {
    if (data.action === 'open') {
      const file = data.url ? await downloadFile(data.url) : data.file;
      started = performance.now();
      self.postMessage({ type: 'progress', message: 'Opening NetCDF and reading metadata…' });
      const result = await openFile(file, data.vendor);
      self.postMessage({ type: 'opened', result, elapsedMs: performance.now() - started });
    } else if (data.action === 'variable') {
      if (!dataset) throw new Error('Open a file first.');
      const result = await readVariable(data.name, data.start, data.count);
      self.postMessage({ type: 'variable', requestId: data.requestId, result, elapsedMs: performance.now() - started });
    }
  } catch (error) {
    self.postMessage({ type: 'error', action: data.action, requestId: data.requestId, message: error.message || String(error), elapsedMs: performance.now() - started });
  }
};
