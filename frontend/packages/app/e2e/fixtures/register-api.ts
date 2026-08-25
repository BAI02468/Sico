import { type Page } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

// Stubs for `POST /api/sico/rbac/user` (registration). Mirrors the login-api
// fixture pattern: assert the frontend reaction, not backend auth.

// Success: envelope with a positive id (registerNewUserResponseSchema).
export async function mockRegisterSuccess(page: Page): Promise<void> {
  await page.route("**/api/sico/rbac/user", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeOkEnvelope({ id: 1234 })),
    });
  });
}

// Conflict: 200 OK + non-zero envelope code, the wire shape registerApi
// classifies as RegisterRejectedError. `msg` surfaces inline as the
// registration error. No `data` (backend omits it on the failure envelope).
export async function mockRegisterConflict(
  page: Page,
  msg = "Email already registered",
): Promise<void> {
  await page.route("**/api/sico/rbac/user", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 101009, msg }),
    });
  });
}

// Transport failure: a real HTTP 5xx (not a 200+non-zero-code envelope) is
// classified by `registerApi` as `RegisterNetworkError` (kind !== "rejected"),
// which drives the form's distinct "Couldn't reach the server…" copy — a
// different branch from the rejected-conflict path above.
export async function mockRegisterNetworkError(page: Page): Promise<void> {
  await page.route("**/api/sico/rbac/user", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ code: 500, msg: "server error" }),
    });
  });
}
