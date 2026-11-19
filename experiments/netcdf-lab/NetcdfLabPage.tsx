import { useEffect, useRef, useState } from 'react';
import styles from './NetcdfLabPage.module.css';
import { DEFAULT_NETCDF_URL } from './config';
import { descriptions } from './descriptions';
import { defaultSelection, product } from './types';
import type { Metadata, Selection, VariableView } from './types';

type Phase = 'idle' | 'downloading' | 'opening' | 'reading' | 'ready' | 'error' | 'cancelled';
const derivedTabs = [
  { id: 'overview', label: 'File overview' },
  { id: 'species', label: 'Species · joined' },
  { id: 'fleets', label: 'Fleets · joined' },
  { id: 'markets', label: 'Markets · indexed' },
];
const bytes = (n: number) => n < 1048576 ? `${(n / 1024).toFixed(1)} KiB` : `${(n / 1048576).toFixed(1)} MiB`;
const ms = (n?: number) => n === undefined ? '—' : `${Math.round(n).toLocaleString()} ms`;

function joinedData(tab: string, metadata: Metadata) {
  const lookup = metadata.lookups;
  const dimension = (name: string) => metadata.dimensions.find(d => d.name === name)?.size ?? 0;
  if (tab === 'species') return {
    view: 'Species joined by index (constructed by this explorer)',
    sourceVariables: ['species_code', 'species_life_stage'],
    data: Array.from({ length: dimension('species') }, (_, index) => ({ index, species_code: lookup.species_code?.[index] ?? null, species_life_stage: lookup.species_life_stage?.[index] ?? null })),
  };
  if (tab === 'fleets') return {
    view: 'Fleets joined by index (constructed by this explorer)',
    sourceVariables: ['fleet_country_code', 'fleet_gear_code'],
    data: Array.from({ length: dimension('fleet') }, (_, index) => ({ index, country_code: lookup.fleet_country_code?.[index] ?? null, gear_code: lookup.fleet_gear_code?.[index] ?? null })),
  };
  if (tab === 'markets') return {
    view: 'Markets with indices (constructed by this explorer)',
    sourceVariables: ['market_code'],
    data: Array.from({ length: dimension('market') }, (_, index) => ({ index, market_code: lookup.market_code?.[index] ?? null })),
  };
  return {
    filename: metadata.filename,
    sizeBytes: metadata.sizeBytes,
    format: metadata.format,
    dimensions: metadata.dimensions,
    globalAttributes: metadata.globalAttributes,
    variables: metadata.variables,
  };
}

export default function NetcdfLabPage({ backHref = '/' }: { backHref?: string }) {
  const [source, setSource] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState(DEFAULT_NETCDF_URL);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('Open a file to discover its variables.');
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [active, setActive] = useState('overview');
  const [selection, setSelection] = useState<Selection>({ start: [], count: [] });
  const [view, setView] = useState<VariableView | null>(null);
  const [download, setDownload] = useState<{ received: number; total?: number; elapsedMs?: number } | null>(null);
  const [openMs, setOpenMs] = useState<number>();
  const [readMs, setReadMs] = useState<number>();
  const [readerReady, setReaderReady] = useState(false);
  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const sampleRequest = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const base = import.meta.env.BASE_URL;
  const busy = ['downloading', 'opening', 'reading'].includes(phase);
  const opening = phase === 'downloading' || phase === 'opening';
  const variable = metadata?.variables.find(v => `variable:${v.name}` === active);
  const count = product(selection.count);
  const invalid = !!variable && (count > (metadata?.maxValues ?? 10000) || variable.shape.some((size, i) => !Number.isInteger(selection.start[i]) || !Number.isInteger(selection.count[i]) || selection.start[i] < 0 || selection.count[i] < 1 || selection.start[i] + selection.count[i] > size));
  const output = metadata ? variable ? view : joinedData(active, metadata) : null;
  const json = output ? JSON.stringify(output, null, 2) : '';

  useEffect(() => () => {
    worker.current?.terminate();
    sampleRequest.current?.abort();
  }, []);

  const release = () => {
    worker.current?.terminate();
    worker.current = null;
    requestId.current++;
    setReaderReady(false);
  };

  const selectFile = (next: File) => {
    release();
    setFile(next); setSource('file'); setMetadata(null); setView(null);
    setPhase('idle'); setError(''); setActive('overview'); setDownload(null); setOpenMs(undefined); setReadMs(undefined);
    setMessage('Local file selected. Choose Open file.');
  };

  const readVariable = (name: string, next: Selection) => {
    if (!worker.current) return;
    setError(''); setView(null); setPhase('reading'); setReadMs(undefined);
    setMessage(`Reading ${name}…`);
    worker.current.postMessage({ action: 'variable', name, ...next, requestId: ++requestId.current });
  };

  const start = () => {
    if (busy || (source === 'file' && !file)) return;
    if (source === 'url') {
      try { if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error(); }
      catch { setError('Enter a valid HTTP or HTTPS file URL.'); return; }
    }
    release(); setMetadata(null); setView(null); setError(''); setActive('overview');
    setDownload(null); setOpenMs(undefined); setReadMs(undefined);
    setPhase(source === 'url' ? 'downloading' : 'opening');
    setMessage(source === 'url' ? 'Downloading the complete file…' : 'Opening local file…');
    const nextWorker = new Worker(`${base}netcdf-lab/reader-worker.js`);
    worker.current = nextWorker;
    nextWorker.onerror = event => {
      event.preventDefault(); release(); setPhase('error'); setError(event.message || 'Reader worker failed.');
    };
    nextWorker.onmessageerror = () => { release(); setPhase('error'); setError('Could not receive the reader result.'); };
    nextWorker.onmessage = ({ data }) => {
      if (worker.current !== nextWorker) return;
      if (data.type === 'download-progress' || data.type === 'downloaded') {
        setDownload({ received: data.received, total: data.total, elapsedMs: data.elapsedMs });
        if (data.type === 'downloaded') setPhase('opening');
      }
      if (data.type === 'progress') setMessage(data.message);
      if (data.type === 'opened') {
        setMetadata(data.result); setReaderReady(true); setOpenMs(data.elapsedMs); setPhase('ready');
        setMessage(`Opened ${data.result.format}. Select any variable to inspect its data.`);
      }
      if (data.type === 'variable' && data.requestId === requestId.current) {
        setView(data.result); setReadMs(data.elapsedMs); setPhase('ready');
        setMessage(`Read ${data.result.returnedValues.toLocaleString()} values from ${data.result.variable}.`);
      }
      if (data.type === 'error' && (data.action === 'open' || data.requestId === requestId.current)) {
        if (data.action === 'open') release();
        setPhase('error'); setError(data.message); setMessage('Read failed. See the error below.');
      }
    };
    nextWorker.postMessage({ action: 'open', ...(source === 'url' ? { url } : { file }), vendor: new URL(`${base}netcdf-lab/vendor`, location.origin).href });
  };

  const selectTab = (id: string) => {
    requestId.current++; setActive(id); setError(''); setView(null); setReadMs(undefined);
    const nextVariable = metadata?.variables.find(v => `variable:${v.name}` === id);
    if (nextVariable && metadata) {
      const next = defaultSelection(nextVariable, metadata.maxValues);
      setSelection(next);
      if (readerReady) readVariable(nextVariable.name, next);
    } else {
      if (phase === 'reading') setPhase('ready');
      setMessage('Joined views are built from aligned source arrays; variable tabs show the source values.');
    }
  };

  const changeRange = (axis: number, field: 'start' | 'count', value: number) => {
    setSelection(previous => {
      const next = { start: [...previous.start], count: [...previous.count] };
      next[field][axis] = value;
      if (field === 'start' && variable) next.count[axis] = Math.max(1, Math.min(next.count[axis], variable.shape[axis] - value));
      return next;
    });
    setView(null); setError(''); setMessage('Selection changed. Choose Read selection to inspect these values.');
  };

  const cancel = () => { release(); setPhase('cancelled'); setMessage('Reader stopped. Reopen the file to request more values.'); };
  const loadExample = async () => {
    sampleRequest.current?.abort();
    const controller = new AbortController(); sampleRequest.current = controller;
    try {
      const response = await fetch(`${base}netcdf-lab/classic-example.nc`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Example download failed (${response.status}).`);
      selectFile(new File([await response.blob()], 'classic-example.nc'));
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : String(failure)); }
  };
  const exportJson = () => {
    const address = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = address;
    anchor.download = `${variable?.name ?? active}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(address), 1000);
  };
  const tabs = [...derivedTabs, ...(metadata?.variables.map(v => ({ id: `variable:${v.name}`, label: v.name })) ?? [])];

  return <main className={styles.page}><div className={styles.container}>
    <header className={styles.header}>
      <a href={backHref} className={styles.back}>← Back</a>
      <span className={styles.eyebrow}>EARTHYSCIENCE / NETCDF EXPLORER</span>
      <h1>See what’s inside.</h1>
      <p>Open your NetCDF file once. Explore each variable as JSON, with its original units, dimensions, and values.</p>
    </header>
    <section className={styles.sourceCard} aria-label="NetCDF source">
      <div className={styles.sourceHeading}><span className={styles.fileIcon}>.nc</span><div><h2>EarthyScience reader</h2><p><code>@earthyscience/netcdf4-wasm@0.3.0</code> · browser processing in a Web Worker</p></div></div>
      <label className={styles.urlLabel}>NetCDF file URL<input type="url" value={url} disabled={busy} onChange={event => setUrl(event.target.value)} /></label>
      <div className={styles.actions}>
        <button className={source === 'url' ? styles.primary : styles.secondary} disabled={busy} onClick={() => setSource('url')}>Use URL</button>
        <input ref={fileInput} type="file" className={styles.fileInput} aria-label="Choose NetCDF file" accept=".nc,.nc4,.cdf" onChange={event => { const next = event.target.files?.[0]; if (next) { sampleRequest.current?.abort(); selectFile(next); } event.target.value = ''; }} />
        <button className={source === 'file' ? styles.primary : styles.secondary} disabled={busy} onClick={() => fileInput.current?.click()}>Choose local file</button>
        <button className={styles.secondary} disabled={busy} onClick={loadExample}>Try small example</button>
        <button className={styles.primary} disabled={busy || (source === 'url' ? !url.trim() : !file)} onClick={start}>{source === 'url' ? 'Fetch & open' : 'Open file'}</button>
        {(busy || readerReady) && <button className={styles.secondary} onClick={cancel}>{busy ? 'Cancel' : 'Release file'}</button>}
      </div>
      <p className={styles.sourceSummary}>Next source: {source === 'url' ? 'URL · complete download · no login credentials sent' : `${file?.name ?? 'No file'}${file ? ` · ${bytes(file.size)}` : ''}`}</p>
      {metadata && <p className={styles.sourceSummary}>Opened file: <strong>{metadata.filename}</strong> · {bytes(metadata.sizeBytes)}</p>}
      {phase === 'downloading' && <div className={styles.downloadProgress}><label htmlFor="download-progress">{bytes(download?.received ?? 0)}{download?.total ? ` / ${bytes(download.total)} · ${Math.floor(download.received / download.total * 100)}%` : ' received'}</label><progress id="download-progress" aria-label="Download progress" max={download?.total ?? 1} value={download?.total ? download.received : undefined} /></div>}
    </section>
    <p className={styles.privacy}>Files are downloaded directly into your browser and never uploaded. Switching variable tabs reads from the same open file; it does not download it again.</p>
    <div className={styles.stats}>
      <div><span>Download</span><strong>{download ? ms(download.elapsedMs) : '—'}</strong></div>
      <div><span>Open & inspect</span><strong>{ms(openMs)}</strong></div>
      <div><span>Latest read</span><strong>{ms(readMs)}</strong></div>
      <div><span>Variables</span><strong>{metadata?.variables.length ?? '—'}</strong></div>
    </div>
    <p role="status" aria-live="polite" className={styles.status}>{message}</p>
    {error && <div role="alert" className={styles.error}>{error}</div>}
    {metadata?.warnings.map(warning => <p key={warning} className={styles.notice}>{warning}</p>)}
    {metadata && <div className={styles.explorer}>
      <div className={styles.tabs} role="tablist" aria-orientation="vertical" aria-label="NetCDF variables">
        {tabs.map((tab, index) => <button key={tab.id} id={`tab-${index}`} role="tab" aria-label={tab.label} aria-selected={active === tab.id} aria-controls="variable-panel" tabIndex={active === tab.id ? 0 : -1} disabled={opening || (tab.id.startsWith('variable:') && !readerReady)} onClick={() => selectTab(tab.id)} onKeyDown={event => {
          const enabled = tabs.filter(t => !t.id.startsWith('variable:') || readerReady);
          const current = enabled.findIndex(t => t.id === tab.id);
          const next = event.key === 'ArrowDown' ? (current + 1) % enabled.length : event.key === 'ArrowUp' ? (current - 1 + enabled.length) % enabled.length : event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : null;
          if (next !== null) { event.preventDefault(); const target = enabled[next]; selectTab(target.id); document.getElementById(`tab-${tabs.findIndex(t => t.id === target.id)}`)?.focus(); }
        }}><span>{tab.label}</span>{tab.id.startsWith('variable:') && <small>{metadata.variables.find(v => `variable:${v.name}` === tab.id)?.shape.join(' × ') || 'scalar'}</small>}</button>)}
      </div>
      <section id="variable-panel" role="tabpanel" aria-labelledby={`tab-${tabs.findIndex(t => t.id === active)}`} className={styles.panel}>
        <div className={styles.panelHeader}><div><span className={styles.eyebrow}>{variable ? 'SOURCE VARIABLE' : 'FILE / LOOKUP VIEW'}</span><h2>{variable?.name ?? derivedTabs.find(t => t.id === active)?.label}</h2></div>{json && <button className={styles.secondary} onClick={exportJson}>Download JSON</button>}</div>
        <p className={styles.explanation}>{variable ? descriptions[variable.name] ?? 'Values decoded from this variable, in the dimension order stored in the file.' : active === 'overview' ? 'The file’s metadata: dimensions, variable definitions, and attributes. Select a variable to read its actual data.' : 'This view joins the file’s separate lookup arrays by index. It is constructed for readability; the underlying arrays each have their own variable tab.'}</p>
        {variable && <>
          <div className={styles.tags}><span>{variable.type}</span><span>Units: {String(variable.attributes.units ?? 'not specified')}</span><span>{product(variable.shape).toLocaleString()} total values</span></div>
          {variable.shape.length > 0 && <div className={styles.rangeTable}><table><thead><tr><th>Dimension</th><th>Size</th><th>Start index</th><th>Count</th></tr></thead><tbody>{variable.dimensions.map((name, axis) => <tr key={`${name}-${axis}`}><td>{name}</td><td>{variable.shape[axis]}</td><td><input type="number" aria-label={`${name} start index`} min={0} max={variable.shape[axis] - 1} value={selection.start[axis] ?? 0} disabled={busy || !readerReady} onChange={event => changeRange(axis, 'start', Number(event.target.value))} /></td><td><input type="number" aria-label={`${name} count`} min={1} max={variable.shape[axis] - selection.start[axis]} value={selection.count[axis] ?? 1} disabled={busy || !readerReady} onChange={event => changeRange(axis, 'count', Number(event.target.value))} /></td></tr>)}</tbody></table></div>}
          <div className={styles.actions}><button className={styles.primary} disabled={busy || !readerReady || invalid} onClick={() => readVariable(variable.name, selection)}>Read selection</button><span className={styles.selectionSummary}>{count.toLocaleString()} selected / {metadata.maxValues.toLocaleString()} maximum per view</span></div>
          {invalid && <p className={styles.notice}>Use valid ranges and select at most {metadata.maxValues.toLocaleString()} values. Reduce the counts to read a smaller slice.</p>}
          {view && <p className={styles.scope}>{view.completeVariable ? 'Complete variable' : 'Selected slice — not the entire variable'} · {view.returnedValues.toLocaleString()} of {view.totalValues.toLocaleString()} values · nested in source dimension order</p>}
        </>}
        <p className={styles.encoding}>Source values keep their original units and fill markers. JSON cannot represent NaN or infinity, so they appear as strings. No unit conversion or aggregation is applied.</p>
        {json ? <pre className={styles.json} aria-label="Variable JSON">{json}</pre> : <div className={styles.empty}>{phase === 'reading' ? 'Reading selected values…' : 'Choose Read selection to display JSON.'}</div>}
      </section>
    </div>}
    <footer className={styles.footer}>EarthyScience only. Large variables are explored through bounded slices; up to 10,000 values per view. The full compressed file is still downloaded and held by the reader until released.</footer>
  </div></main>;
}
