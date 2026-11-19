import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./serverState/queryClient";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/design-system/tokens.css";
import "./styles/design-system/globals.css";
import App from "./App.tsx";

// This app has no service worker. Remove an old /sw.js left on this dev origin
// before rendering, so its runtime cache cannot consume API/asset responses.
if (import.meta.env.DEV && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) && "serviceWorker" in navigator) {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    let removedController = false;
    for (const registration of registrations) {
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      if (worker && new URL(worker.scriptURL).pathname === "/sw.js") {
        const controlled = navigator.serviceWorker.controller?.scriptURL === worker.scriptURL;
        const removed = await registration.unregister();
        removedController ||= removed && controlled;
      }
    }
    if (removedController) location.reload();
  } catch (error) {
    console.warn("Unable to remove the legacy localhost service worker", error);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
