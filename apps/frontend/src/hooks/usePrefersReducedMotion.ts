import { useSyncExternalStore } from "react";
const query = "(prefers-reduced-motion: reduce)";
const getSnapshot = () =>
  typeof window === "undefined" || window.matchMedia(query).matches;
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
// Keep long-running decorative effects in sync when the OS preference changes at runtime.
export default function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
