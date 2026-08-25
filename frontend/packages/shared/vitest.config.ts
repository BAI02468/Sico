/// <reference types="vitest" />
import path from "node:path";
import { lingui } from "@lingui/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import type { Plugin } from "vite";

import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "@sico/config/vitest.config.base.ts";

const RTL_WRAPPER = path.resolve(
  __dirname,
  "test/_helpers/render-with-i18n.tsx",
);

// Redirect `@testing-library/react` imports to a wrapper that renders every
// component/hook inside an <I18nProvider>, so Lingui's `<Trans>`/`useLingui`
// work without each test adding the provider. The wrapper itself imports the
// real RTL (its own import isn't redirected), breaking the resolution cycle.
const rtlI18nWrapper: Plugin = {
  name: "rtl-i18n-wrapper",
  enforce: "pre",
  resolveId(source, importer) {
    if (
      source === "@testing-library/react" &&
      importer != null &&
      !importer.includes("render-with-i18n")
    ) {
      return RTL_WRAPPER;
    }
    return null;
  },
};

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      rtlI18nWrapper,
      // `react()` runs the Lingui SWC transform so `t`/`<Trans>` macros are
      // compiled away in tests (mirrors packages/app/vite.config.ts). Without
      // it the macros execute uncompiled and throw "outside the context of
      // compilation". `lingui()` handles `.po` catalog imports.
      react({ plugins: [["@lingui/swc-plugin", {}]] }),
      lingui(),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    test: {
      // Pin the timezone so `formatDateTime` (which renders in the viewer's
      // local zone) matches the `Date.UTC(...)`-based fixtures in date tests
      // (e.g. asset-detail's "2026-01-18 16:31"); mirrors CI's UTC default.
      env: { TZ: "UTC" },
      include: ["test/**/*.test.{ts,tsx}"],
      setupFiles: ["test/setup.ts"],
      environment: "./test/_helpers/jsdom-fetch-env.ts",
      coverage: {
        include: ["src/**"],
      },
    },
  }),
);
