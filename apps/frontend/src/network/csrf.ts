export const readCsrfToken = (): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const value = document.cookie.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("surimi_csrf="))
    ?.slice("surimi_csrf=".length);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
};
