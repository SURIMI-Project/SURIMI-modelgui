// Only return to a path within this app. Never accept an external URL or login loop.
export const getReturnPath = (value: string | null): string => {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")
    || Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return "/";
  try {
    const url = new URL(value, "https://surimi.invalid");
    const decodedPath = decodeURIComponent(url.pathname);
    if (url.origin !== "https://surimi.invalid" || decodedPath.includes("\\")
      || decodedPath.startsWith("//") || /^\/login(?:\/|$)/i.test(decodedPath)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
};
