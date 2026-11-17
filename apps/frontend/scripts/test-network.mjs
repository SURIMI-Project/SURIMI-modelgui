import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const temporary = await mkdtemp(join(tmpdir(), "surimi-network-tests-"));
try {
  const names = ["network.test", "experimentState.test"];
  await build({
    entryPoints: names.map((name) => `tests/${name}.ts`),
    outdir: temporary,
    outExtension: { ".js": ".mjs" },
    bundle: true,
    platform: "node",
    format: "esm",
    // Bundle packages as well so the temporary file is independent of module lookup.
    // Axios' ESM entry has Node built-ins imported through CJS dependencies.
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
    define: { "import.meta.env": "{}" },
  });
  const result = spawnSync(process.execPath, ["--test", ...names.map((name) => join(temporary, `${name}.mjs`))], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
