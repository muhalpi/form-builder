import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

function normalizeApiBaseUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

setBaseUrl(normalizeApiBaseUrl(import.meta.env.VITE_API_URL));

createRoot(document.getElementById("root")!).render(<App />);
