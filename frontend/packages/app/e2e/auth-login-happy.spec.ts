import { expect, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

import { mockLoginSuccess } from "./fixtures/login-api";
import { mockEndpoint } from "./fixtures/project-fixtures";
import { realLogin, realLoginTo, skipWithoutCreds } from "./fixtures/real-auth";
import {
  mockBoundOrganizationAccess,
  mockSicoApi,
  seedAuth,
} from "./fixtures/seed-auth";

// Happy-path E2E for `/login`. Backend is mocked via `page.route` because
// Playwright's `webServer` runs `vite preview` (no dev proxy), so a real
// `/api/sico/rbac/login` from `:4173` would 404. Assertions lock URL
// transitions plus landed-page structure; the safe-next allowlist matrix is
// unit-tested in @sico/shared.
//
// The `@real` block at the bottom is the ONLY exception: it hits the deployed
// app with a genuine form login. Its describe carries no mock `beforeEach`, so
// the real request is never intercepted. `SICO_E2E_URL` gates the two blocks
// apart — the mock block runs locally, the `@real` block runs only against a
// deployed environment.

test.describe("login happy path", () => {
  test.beforeEach(async ({ page }) => {
    await mockSicoApi(page);
    await mockLoginSuccess(page);
  });

  test(
    "user signs in with valid credentials and lands on /digital-worker",
    { tag: ["@core", "@auth"] },
    async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel(/email address/i).fill("operator@sico.local");
      // `^password$` anchors avoid colliding with the "Show password" sr-only label.
      await page.getByLabel(/^password\*?$/i).fill("operator");
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL(/\/digital-worker/);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Digital Workers",
          exact: true,
        }),
      ).toBeVisible();
    },
  );

  test(
    "?next path is respected after sign-in",
    { tag: ["@core", "@auth"] },
    async ({ page }) => {
      await mockEndpoint(page, "project/user_projects", () => ({
        body: makeOkEnvelope({ projects: [], total: 0, hasNext: false }),
      }));
      await page.goto("/login?next=%2Fproject");
      await page.getByLabel(/email address/i).fill("operator@sico.local");
      await page.getByLabel(/^password\*?$/i).fill("operator");
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL((url) => url.pathname === "/project");
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Projects",
          exact: true,
        }),
      ).toBeVisible();
    },
  );

  test(
    "malicious ?next is rejected",
    { tag: ["@core", "@auth"] },
    async ({ page }) => {
      await page.goto("/login?next=%2F%2Fevil.com%2Fdigital-worker");
      const trustedOrigin = new URL(page.url()).origin;
      await page.getByLabel(/email address/i).fill("operator@sico.local");
      await page.getByLabel(/^password\*?$/i).fill("operator");
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL(
        (url) =>
          url.origin === trustedOrigin && url.pathname === "/digital-worker",
      );
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Digital Workers",
          exact: true,
        }),
      ).toBeVisible();
    },
  );

  test(
    "an already-authed visit to /login bounces to /digital-worker",
    { tag: ["@key", "@auth"] },
    async ({ page }) => {
      // `routes/login.tsx#beforeLoad` reads `getAccessToken()` (seeded here) and
      // throws a pre-React `redirect()` to the mode landing — an operator lands
      // on /digital-worker, so the login form never renders.
      await seedAuth(page);
      await page.goto("/login");
      await expect(page).toHaveURL(/\/digital-worker/);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Digital Workers",
          exact: true,
        }),
      ).toBeVisible();
    },
  );

  // Developer mode: the login page defaults to operator; the "Go to SICO.Dev"
  // toggle switches the form to developer, and a successful sign-in in that mode
  // lands on /studio (DEVELOPER_HOME) instead of /digital-worker. Locks the
  // mode→landing wiring end-to-end through the real form UI (the unit tests
  // cover the toggle and the redirect in isolation; this covers the full flow).
  // NOT @core: a one-time mode-switch wiring, not a key front↔back flow — and it
  // has no @real twin (no developer account in .env.test.local).
  test(
    "developer-mode sign-in lands on /studio",
    { tag: ["@key", "@auth"] },
    async ({ page }) => {
      await mockBoundOrganizationAccess(page);
      await page.route(
        "**/api/sico/agent/single_agent_infos",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(makeOkEnvelope({ agentInfos: [] })),
          });
        },
      );
      await page.goto("/login");
      // Default face is operator.
      await expect(
        page.getByRole("heading", { name: "Sign in" }),
      ).toBeVisible();
      // Flip to the developer face.
      await page.getByRole("button", { name: "Go to SICO.Dev" }).click();
      await expect(
        page.getByRole("heading", { name: "Welcome to SICO.Dev" }),
      ).toBeVisible();

      await page.getByLabel(/email address/i).fill("developer@sico.local");
      await page.getByLabel(/^password\*?$/i).fill("developer");
      await page.getByRole("button", { name: /continue/i }).click();

      await expect(page).toHaveURL(/\/studio/);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Studio",
          exact: true,
        }),
      ).toBeVisible();
    },
  );
});

// REAL environment (@real): genuine form login against the deployed app. No
// `page.route` mocking — these run only when `SICO_E2E_URL` is set and admin
// creds exist in `.env.test.local`. Structural assertions only (landed URL, no
// error boundary) so they survive real-data drift.
//
// One login role only: admin and user are indistinguishable at the login step
// (same form, same landing), so a second role added nothing. Role-specific
// authorization is a mock concern, deliberately not exercised here.
test.describe("login happy path @real", () => {
  test(
    "signs in for real and lands on /digital-worker",
    { tag: ["@core", "@auth"] },
    async ({ page }) => {
      skipWithoutCreds("admin");
      await realLogin(page, "admin");
      await expect(page).toHaveURL(/\/digital-worker/);
      // No crash into the error boundary.
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  // Real twin of the mock "?next is respected": a genuine sign-in with a safe
  // ?next lands on that path, not the default /digital-worker.
  test(
    "real ?next path is respected after sign-in",
    { tag: ["@core", "@auth"] },
    async ({ page }) => {
      skipWithoutCreds("admin");
      await realLoginTo(page, "admin", "/login?next=%2Fproject");
      await expect(page).toHaveURL((url) => url.pathname === "/project");
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Projects",
          exact: true,
        }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  // Real twin of the mock "malicious ?next is rejected": an off-site ?next is
  // ignored and the user still lands on the default landing.
  test(
    "real malicious ?next is rejected",
    { tag: ["@core", "@auth"] },
    async ({ page }) => {
      skipWithoutCreds("admin");
      const trustedOrigin = await realLoginTo(
        page,
        "admin",
        "/login?next=%2F%2Fevil.com%2Fdigital-worker",
      );
      await expect(page).toHaveURL(
        (url) =>
          url.origin === trustedOrigin && url.pathname === "/digital-worker",
      );
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Digital Workers",
          exact: true,
        }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );
});
