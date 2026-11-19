import { getReturnPath } from "./returnPath";

export const getSsoLoginPath = (loginUrl: string, next: string): string => {
  const url = new URL(loginUrl, "https://surimi.invalid");
  if (url.origin !== "https://surimi.invalid"
    || !/^\/api\/v1\/auth\/sso\/[A-Za-z0-9_.-]+\/login$/.test(url.pathname)) {
    throw new Error("Unexpected SSO provider URL.");
  }
  url.searchParams.set("next", getReturnPath(next));
  return `${url.pathname}${url.search}`;
};
