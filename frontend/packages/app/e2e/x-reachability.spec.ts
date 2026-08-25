import { expect, type Page, test } from "@playwright/test";

import { realLogin, skipWithoutCreds } from "./fixtures/real-auth";
import {
  mockBoundOrganizationAccess,
  mockSicoApi,
  seedAuth,
} from "./fixtures/seed-auth";

// REACHABILITY sweep — the cheapest whole-app health probe. For each route
// we assert only the generic "page is alive" contract:
//   1. a top-level <h1> renders (the route mounted, not a white screen)
//   2. no error-boundary fallback (role="alert") is shown
//
// Deep per-feature behaviour lives in the feature specs; this file exists so
// a single broken route surfaces immediately, without decoding a feature
// failure. Uses only the empty `mockSicoApi` catch-all — routes that need
// richer data to render their shell are asserted via their own specs, not
// here.

async function expectReachable(page: Page, path: string): Promise<void> {
  await page.goto(path);
  // The route stayed put — no silent auth redirect elsewhere.
  await expect(page).toHaveURL(new RegExp(`${path}(\\?|$)`));
  // A top-level heading proves the route shell mounted.
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  // The error-boundary fallback uses role="alert"; its absence proves the
  // route did not crash into ErrorView.
  await expect(page.getByRole("alert")).toHaveCount(0);
}

// Unauthenticated public routes.
const PUBLIC_ROUTES = ["/login", "/register"];

// Authenticated top-level routes reachable with only the empty catch-all.
// Route mode is derived from the URL; detail routes with `$id` params are
// covered by their feature specs.
const AUTHED_ROUTES = ["/digital-worker", "/project", "/studio", "/profile"];

test.describe("route reachability sweep", () => {
  test.beforeEach(async ({ page }) => {
    await mockSicoApi(page);
  });

  for (const path of PUBLIC_ROUTES) {
    test(
      `${path} is reachable (renders h1, no error fallback)`,
      {
        tag: ["@reachable"],
      },
      async ({ page }) => {
        await expectReachable(page, path);
      },
    );
  }

  // Marketing `/` document-redirects to the standalone static landing site.
  // It has no h1, so use its stable main landmark + branded home link as the
  // reachability signal instead of the SPA route helper's heading contract.
  test(
    "/ redirects to the standalone landing page",
    { tag: ["@reachable"] },
    async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/landing\/index\.html$/);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("link", { name: "SICO home" })).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  for (const path of AUTHED_ROUTES) {
    test(
      `${path} is reachable when authenticated`,
      {
        tag: ["@reachable"],
      },
      async ({ page }) => {
        await seedAuth(page);
        if (path === "/studio") {
          await mockBoundOrganizationAccess(page);
        }
        await expectReachable(page, path);
      },
    );
  }

  test(
    "an unknown path renders the 404 page (not a crash)",
    {
      tag: ["@reachable"],
    },
    async ({ page }) => {
      await page.goto("/this-route-does-not-exist");
      await expect(
        page.getByRole("heading", { level: 1, name: "Page not found" }),
      ).toBeVisible();
      // The SPA renders 404 in place — the bad URL is preserved, not rewritten.
      await expect(page).toHaveURL(/\/this-route-does-not-exist$/);
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );
});

// REAL environment (@real): the same reachability contract (h1 mounts, no error
// fallback) but on live data after a genuine admin login. No mocking — runs only
// when `SICO_E2E_URL` is set. `$id` detail routes are excluded (their data is
// not owner-stable).
test.describe("route reachability sweep @real", () => {
  const REACHABLE = ["/digital-worker", "/project", "/profile"];
  for (const path of REACHABLE) {
    test(
      `real route ${path} is reachable (h1, no error fallback)`,
      { tag: ["@reachable"] },
      async ({ page }) => {
        skipWithoutCreds("admin");
        await realLogin(page, "admin");

        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page).toHaveURL(new RegExp(`${path}(\\?|$|/)`));
        await expect(
          page.getByRole("heading", { level: 1 }).first(),
        ).toBeVisible();
        await expect(page.getByRole("alert")).toHaveCount(0);
      },
    );
  }
});
