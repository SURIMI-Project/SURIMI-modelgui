// Base URL of the controller's gRPC-Web endpoint (no trailing slash). Its proxy
// (Envoy) was removed on 2026-11-17 and nginx answers /api/controller with 410,
// so builds use MOCK=true until phase 10 moves the app onto the backend API.
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api/controller"
).replace(/\/+$/, "");

// Serve canned controller responses instead of calling the controller (see
// src/lib/services/controllerMock.ts). Set with MOCK=true at build time.
export const MOCK = __MOCK__;
