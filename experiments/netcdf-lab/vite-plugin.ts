import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// Serve the packages' own WASM/loaders unchanged, in dev and production.
// This keeps their differing runtimes out of the main application bundle.
export async function netcdfLabPlugin(): Promise<Plugin> {
  const assets = new Map<string, Uint8Array>();
  const localAssets = new Map<string, string>();
  const labDirectory = fileURLToPath(new URL('.', import.meta.url));
  for (const file of readdirSync(resolve(labDirectory, 'assets'))) {
    const name = `netcdf-lab/${file}`;
    const path = resolve(labDirectory, 'assets', file);
    localAssets.set(name, path);
    assets.set(name, readFileSync(path));
  }
  {
    const id = 'earthy';
    const pkg = '@earthyscience/netcdf4-wasm';
    const directory = dirname(fileURLToPath(import.meta.resolve(pkg)));
    for (const file of readdirSync(directory)) {
      if (/\.(js|wasm)$/.test(file) && file !== 'test-setup.js') {
        assets.set(`netcdf-lab/vendor/${id}/${file}`, readFileSync(resolve(directory, file)));
      }
    }
    assets.set(`netcdf-lab/vendor/${id}/LICENSE`, readFileSync(resolve(directory, '..', 'LICENSE')));
  }
  return {
    name: 'netcdf-lab-runtimes',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0];
        const key = pathname?.startsWith(server.config.base)
          ? pathname.slice(server.config.base.length)
          : pathname?.replace(/^\//, '');
        const localPath = key ? localAssets.get(key) : undefined;
        const bytes = localPath ? readFileSync(localPath) : key ? assets.get(key) : undefined;
        if (!bytes) return next();
        if (localPath) res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', key!.endsWith('.wasm') ? 'application/wasm' : key!.endsWith('.js') ? 'text/javascript' : key!.endsWith('.nc') ? 'application/x-netcdf' : 'text/plain');
        res.end(bytes);
      });
    },
    generateBundle() {
      for (const [fileName, source] of assets) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}
