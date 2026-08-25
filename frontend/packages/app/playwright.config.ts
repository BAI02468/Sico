import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

// `webServer` runs `vite preview` (production-like static server) so
// E2E coverage stays close to what users actually receive.
const PREVIEW_PORT = 4173;

// Load real-environment credentials from the gitignored `.env.test.local`
// (zero-dependency parser — avoids adding `dotenv`). Values already in the
// process env win, so CI secrets override the file. Only vars not yet set are
// filled, so this never clobbers an explicit `SICO_E2E_URL=… pnpm e2e:real`.
const envFile = fileURLToPath(new URL("./.env.test.local", import.meta.url));
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] === undefined) {
      process.env[key] = trimmed.slice(eq + 1).trim();
    }
  }
}

// Three modes, keyed on two env vars:
//
//   • UNIFIED (E2E_PREVIEW_PROXY_TARGET set) → local `vite preview` carrying a
//     proxy to the deployed backend. ONE baseURL (localhost) serves BOTH mock
//     specs (page.route intercepts, never leave the browser) AND @real specs
//     (fall through the proxy to the real backend). No gating — everything runs
//     together, so a single UI-mode tree shows and runs the whole suite. This is
//     the local "see it all" mode.
//
//   • REAL (SICO_E2E_URL set, no proxy target) → hit the deployed app directly,
//     run ONLY `@real`. Used by the nightly real-env CI job.
//
//   • MOCK (neither set) → local `vite preview`, run everything EXCEPT `@real`
//     (the hermetic suite). This is the default PR-CI path.
const proxyTarget = process.env.E2E_PREVIEW_PROXY_TARGET;
const isUnified = Boolean(proxyTarget);
const isReal = !isUnified && Boolean(process.env.SICO_E2E_URL);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  // Unified runs both; real runs only @real; mock excludes @real.
  grep: isReal ? /@real/ : undefined,
  grepInvert: isReal || isUnified ? undefined : /@real/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Bumped to match webServer.timeout so a slow first build isn't blamed
  // on a slow test.
  timeout: 120_000,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["json", { outputFile: "playwright-report/e2e.json" }],
      ]
    : "list",
  use: {
    // REAL points the browser straight at the deployed app. UNIFIED and MOCK
    // both load from the local preview (UNIFIED's preview proxies /api onward).
    baseURL:
      isReal && process.env.SICO_E2E_URL
        ? process.env.SICO_E2E_URL
        : `http://localhost:${PREVIEW_PORT}`,
    headless: true,
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // REAL hits a remote host, so no local server. UNIFIED and MOCK both boot
  // preview; UNIFIED passes the proxy target through so /api is forwarded on.
  webServer: isReal
    ? undefined
    : {
        command: isUnified
          ? `E2E_PREVIEW_PROXY_TARGET=${proxyTarget} pnpm vite preview --port ${PREVIEW_PORT}`
          : `pnpm vite preview --port ${PREVIEW_PORT}`,
        port: PREVIEW_PORT,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
