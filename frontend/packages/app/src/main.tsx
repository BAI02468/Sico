import { i18n } from "@lingui/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/app";
import "@/styles/globals.css";

// Activate an empty "en" catalog before rendering so eager `t()` calls (zod
// schema messages, table-header labels) fall back to their source strings until
// <I18nProvider> activates the real catalog in its effect.
i18n.loadAndActivate({ locale: "en", messages: {} });

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
