import { expect, test } from "@playwright/test";

import { mockLoginCredentialsError } from "./fixtures/login-api";
import { mockSicoApi } from "./fixtures/seed-auth";

// Sad-path E2E for `/login`. Locks three behavioural contracts:
//   1. Backend rejects credentials → inline error + stays on /login
//   2. Client-side zod failure → inline error + NO request fired
//   3. Unauthenticated access to a protected route → redirect carries the
//      auth signal (?code=401&next=…), toasts, then strips code while preserving
//      next (was not-found-and-next / smoke).
// Backend is hermetically mocked (Task 10 pattern). Locators use
// `getByRole("textbox", { name: /…/i })` — robust to label-asterisk drift
// (T10.I2). URL regexes are anchored (T10.I1).

test(
  "incorrect credentials render inline error and keep user on /login",
  { tag: ["@error", "@auth"] },
  async ({ page }) => {
    await mockLoginCredentialsError(page);
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: /email/i })
      .fill("operator@sico.local");
    // `^password` anchors so we don't collide with "Show password" sr-only label.
    await page
      .getByRole("textbox", { name: /^password/i })
      .fill("wrong-password");

    // Wait for the 401-ish response in lockstep with the click so the
    // assertion below doesn't race the in-flight mutation (T10.I3).
    await Promise.all([
      page.waitForResponse("**/api/sico/rbac/login"),
      page.getByRole("button", { name: /continue/i }).click(),
    ]);

    // `<FieldError>` from @sico/ui renders `role="alert"` (verified in
    // packages/ui/src/components/ui/field.tsx).
    await expect(page.getByRole("alert")).toContainText(/incorrect/i);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  },
);

test(
  "client-side zod failure renders inline error and fires no API request",
  { tag: ["@error", "@auth"] },
  async ({ page }) => {
    // No mock: this test asserts the request is NEVER made.
    const loginRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/sico/rbac/login")) {
        loginRequests.push(request.url());
      }
    });

    await page.goto("/login");
    await page.getByRole("textbox", { name: /email/i }).fill("notanemail");
    await page.getByRole("textbox", { name: /^password/i }).fill("123");
    await page.getByRole("button", { name: /continue/i }).click();

    // The friendly zod message is "Please enter a valid email". Lock the
    // user-visible signal ("valid email") + the "no request fired"
    // invariant; the exact wording can evolve without breaking this test.
    await expect(page.getByRole("alert").first()).toContainText(/valid email/i);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    // Lock the "no API call" invariant explicitly so a future RHF gating
    // regression can't silently false-pass.
    expect(loginRequests).toEqual([]);
  },
);

test(
  "unauthenticated /digital-worker redirects with an auth signal, toasts, and preserves next",
  { tag: ["@core", "@auth"] },
  async ({ page }) => {
    // Unauthenticated: clear any seeded identity. `mockSicoApi` turns an
    // accidental fetch into a meaningful assertion failure, not ECONNREFUSED.
    await page.addInitScript(() => {
      // eslint-disable-next-line no-restricted-syntax -- e2e fixture runs in browser context, wrapper unavailable
      localStorage.clear();
    });
    await mockSicoApi(page);

    // Arm the transient auth-signal observer before navigation: the login route
    // strips `code` in an effect soon after it renders.
    const authSignal = page.waitForURL(
      (url) =>
        url.pathname === "/login" &&
        url.searchParams.get("code") === "401" &&
        url.searchParams.get("next") === "/digital-worker",
    );
    await page.goto("/digital-worker");
    await authSignal;

    await expect(page.getByText(/session has expired/i)).toBeVisible();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/login" &&
        url.searchParams.get("next") === "/digital-worker" &&
        !url.searchParams.has("code"),
    );
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Sign in",
        exact: true,
      }),
    ).toBeVisible();
  },
);

// REAL environment (@real): the same auth-guard contract on the deployed app —
// an unauthenticated visit to a protected route must redirect to /login. No
// mocking; runs only when SICO_E2E_URL is set. Structural (landed on /login),
// no data locked.
test.describe("login sad @real", () => {
  test(
    "real unauthenticated visit to /digital-worker redirects to /login",
    { tag: ["@core", "@auth"] },
    async ({ page }) => {
      // Start clean: no seeded identity in this fresh context.
      await page.goto("/digital-worker", { waitUntil: "networkidle" });
      // The auth guard bounces an unauthenticated visitor to /login (the
      // ?code=401&next=… signal may be present; assert only the destination).
      await expect(page).toHaveURL(/\/login(?:\?|$)/);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Sign in",
          exact: true,
        }),
      ).toBeVisible({ timeout: 15_000 });
    },
  );
});
