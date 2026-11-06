import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./serverState/queryClient";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "./styles/globals.css";
import "./index.css";
import App from "./App.tsx";
import { resolver, theme } from "./styles/theming";

const fontPresets = {
  sora: "Sora, Montserrat, Avenir Next, Segoe UI, sans-serif",
  manrope: "Manrope, Montserrat, Avenir Next, Segoe UI, sans-serif",
  archivo: "Archivo, Montserrat, Avenir Next, Segoe UI, sans-serif",
  outfit: "Outfit, Montserrat, Avenir Next, Segoe UI, sans-serif",
  spaceGrotesk: "Space Grotesk, Montserrat, Avenir Next, Segoe UI, sans-serif",
} as const;

type FontPresetKey = keyof typeof fontPresets;

const ACTIVE_FONT: FontPresetKey = "sora";

const selectedFontFamily = fontPresets[ACTIVE_FONT];

if (typeof document !== "undefined") {
  document.documentElement.style.setProperty(
    "--app-font-family",
    selectedFontFamily,
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider
      defaultColorScheme="light"
      theme={theme}
      cssVariablesResolver={resolver}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
