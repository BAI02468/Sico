import { expect, test } from "@playwright/test";

import {
  mockRegisterConflict,
  mockRegisterNetworkError,
  mockRegisterSuccess,
} from "./fixtures/register-api";

// E2E for `/register` — the top of the signup funnel. Backend is mocked via
// `page.route`. On success the form toasts "Account Created" then redirects to
// /login after 2s; invalid input is caught client-side (no request fired);
// a server conflict surfaces inline and keeps the user on /register.

test(
  "valid signup toasts Account Created and redirects to /login",
  {
    tag: ["@key", "@auth"],
  },
  async ({ page }) => {
    await mockRegisterSuccess(page);
    await page.goto("/register");

    await page.getByLabel(/email address/i).fill("newuser@sico.local");
    await page.getByLabel(/^password\*?$/i).fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("Account Created")).toBeVisible();
    // The route redirects to /login 2s after success.
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Sign in",
        exact: true,
      }),
    ).toBeVisible();
  },
);

test(
  "invalid input shows inline error and fires no request",
  {
    tag: ["@error", "@auth"],
  },
  async ({ page }) => {
    // Fail the test if any register request is fired — client-side zod should
    // block it before the network.
    let requested = false;
    await page.route("**/api/sico/rbac/user", async (route) => {
      requested = true;
      await route.abort();
    });

    await page.goto("/register");
    await page.getByLabel(/email address/i).fill("not-an-email");
    await page.getByLabel(/^password\*?$/i).fill("short"); // < 8 chars
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText(/please enter a valid email/i)).toBeVisible();
    expect(requested).toBe(false);
    await expect(page).toHaveURL(/\/register/);
  },
);

test(
  "a server conflict surfaces inline and keeps the user on /register",
  {
    tag: ["@error", "@auth"],
  },
  async ({ page }) => {
    await mockRegisterConflict(page);
    await page.goto("/register");

    await page.getByLabel(/email address/i).fill("taken@sico.local");
    await page.getByLabel(/^password\*?$/i).fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    // The form no longer echoes the server `msg`; a rejected registration shows
    // one fixed, localized inline error and keeps the user on /register.
    await expect(
      page.getByText(
        "We couldn't create your account. Check your details and try again.",
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  },
);

test(
  "a transport failure surfaces the network-error copy, not the rejected copy",
  {
    tag: ["@error", "@auth"],
  },
  async ({ page }) => {
    // A real HTTP 5xx is classified as RegisterNetworkError (kind !== "rejected"),
    // so the form shows the connection-failure string — a DIFFERENT branch from
    // the conflict test above (which shows the fixed rejected copy). Locks the
    // network vs. rejected split end-to-end.
    await mockRegisterNetworkError(page);
    await page.goto("/register");

    await page.getByLabel(/email address/i).fill("newuser@sico.local");
    await page.getByLabel(/^password\*?$/i).fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(
      page.getByText(
        "Couldn't reach the server. Please check your connection and try again.",
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  },
);
