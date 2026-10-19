/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** MOCK=true at build time (see vite.config.ts). */
declare const __MOCK__: boolean;
