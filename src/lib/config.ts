// Base URL of the controller's gRPC-Web endpoint (no trailing slash). In the
// Docker image nginx proxies /api/controller to the Envoy grpc-proxy, so the
// default is same-origin; in dev point it at Envoy directly (see .env.example).
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api/controller"
).replace(/\/+$/, "");
