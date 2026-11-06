const API_CONFIG = {
  BASE_URL: (import.meta.env?.VITE_API_BASE_URL?.trim() || "/api/v1").replace(/\/+$/, ""),
  TIMEOUT_MS: 30_000,
} as const;

export default API_CONFIG;
