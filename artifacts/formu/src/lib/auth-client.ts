import { createAuthClient } from "better-auth/react";

function getAuthBaseUrl(): string | undefined {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return undefined;

  const normalized = apiUrl.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
});
