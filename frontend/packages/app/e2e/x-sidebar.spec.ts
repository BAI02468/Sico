import { expect, type Page, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";
import {
  AUTH_EXPIRES_AT_LS,
  AUTH_TOKEN_LS,
  AUTH_USER_LS,
} from "@sico/shared/utils/local-storage.ts";

import { realLogin, skipWithoutCreds } from "./fixtures/real-auth";
import { mockSicoApi, seedAuth } from "./fixtures/seed-auth";

// E2E for the Sidebar composer. The only authenticated page available
// pre-F3 is `/digital-worker`, so flows that require
// `/digital-worker/$agentId` data are `test.skip`-ed pending F3.
//
// The `@real` block at the bottom logs out against the deployed app; it carries
// no mock `beforeEach`, so `SICO_E2E_URL` cleanly gates it apart from the mock
// block above.

const AUTHED_PAGE = "/digital-worker";

async function clickLogoutAndTrackExpiryToast(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.dataset.sessionExpiredToastSeen = "false";
    const observer = new MutationObserver(() => {
      if (/session has expired/i.test(document.body.textContent)) {
        document.documentElement.dataset.sessionExpiredToastSeen = "true";
        observer.disconnect();
      }
    });
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  await page.getByRole("button", { name: "Account options" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
}

async function expectCleanLogin(page: Page): Promise<void> {
  await expect(page).toHaveURL(
    (url) => url.pathname === "/login" && url.search === "" && url.hash === "",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Sign in",
      exact: true,
    }),
  ).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute(
    "data-session-expired-toast-seen",
    "false",
  );
}

test.describe("sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockSicoApi(page);
  });

  // 1. Active highlight survives refresh.
  //    Needs `/digital-worker` route — `useActiveNav` only matches `/digital-worker`/`/project`.
  test.skip(
    "DW nav has aria-current=page on first paint after reload",
    { tag: ["@a11y"] },
    () => {
      // TODO: unskip after F3 lands /digital-worker routes.
    },
  );

  // 2. Collapse toggle — persisted to localStorage, survives reload.
  //    `sidebarCollapsedAtom` is backed by `SIDEBAR_COLLAPSED_LS`, so the
  //    collapsed preference is restored on the next paint after reload.
  test(
    "collapse toggle changes width and persists across reload",
    { tag: ["@key"] },
    async ({ page }) => {
      await page.goto(AUTHED_PAGE);
      const nav = page.getByRole("navigation", { name: "Primary navigation" });
      await expect(nav).toBeVisible();
      await expect(nav).not.toHaveAttribute("data-collapsed", "true");

      await page.getByRole("button", { name: "Collapse sidebar" }).click();
      await expect(nav).toHaveAttribute("data-collapsed", "true");

      await page.reload();
      const navAfter = page.getByRole("navigation", {
        name: "Primary navigation",
      });
      await expect(navAfter).toBeVisible();
      await expect(navAfter).toHaveAttribute("data-collapsed", "true");
    },
  );

  // 3. Collapsed-state Logo hover reveals toggle. The expand button is always
  //    mounted but revealed via opacity (`opacity-0 group-hover:opacity-100`),
  //    so assert computed opacity rather than Playwright visibility (which
  //    ignores opacity).
  test(
    "collapsed sidebar reveals toggle on Logo hover",
    { tag: ["@key"] },
    async ({ page }) => {
      await page.goto(AUTHED_PAGE);
      await page.getByRole("button", { name: "Collapse sidebar" }).click();

      const expandBtn = page.getByRole("button", { name: "Expand sidebar" });
      await expect(expandBtn).toHaveCSS("opacity", "0");

      // The collapsed rail groups the SICO mark + expand button; hovering the
      // group container triggers `group-hover:opacity-100` on the button. The
      // button overlays the mark, so hover its parent group directly.
      await expandBtn.locator("..").hover();
      await expect(expandBtn).toHaveCSS("opacity", "1");
    },
  );

  // 4. DW list renders ≤ 5. Needs `/digital-worker/$agentId` route since each
  //    row is a `<Link to="/digital-worker/$agentId">` — TanStack Router throws on
  //    unknown routes during render.
  test.skip(
    "DW preview list renders at most 5 agents",
    { tag: ["@dw"] },
    () => {
      // TODO: unskip after F3 lands /digital-worker routes.
      // Mock plan: page.route("**/api/sico/agents*", fulfill paginatedSchema
      // envelope with 200 items) → expect list <li> count === 5.
      void makeOkEnvelope;
    },
  );

  // 5. Logout success → POST sent with Authorization → redirect → back
  //    stays on /login.
  test(
    "logout posts with bearer token and replaces history",
    { tag: ["@core", "@auth"] },
    async ({ page }) => {
      await page.goto(AUTHED_PAGE);

      let logoutRequest:
        | { method: string; authorization: string | null }
        | undefined;
      await page.route("**/api/sico/rbac/logout", async (route) => {
        const req = route.request();
        logoutRequest = {
          method: req.method(),
          authorization: req.headers().authorization ?? null,
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeOkEnvelope({})),
        });
      });

      await clickLogoutAndTrackExpiryToast(page);
      await expectCleanLogin(page);

      expect(logoutRequest?.method).toBe("POST");
      expect(logoutRequest?.authorization).toBe("Bearer tok");

      // replace:true → browser back must not return to the authed page.
      // With a single replaced entry, `goBack()` lands on `about:blank`
      // (no prior history); the contract is "not the authed page", not
      // "still /login".
      await page.goBack();
      await expect(page).not.toHaveURL(new RegExp(`${AUTHED_PAGE}(\\?|$)`));
    },
  );

  // 6. Logout server failure is non-blocking.
  test(
    "logout still redirects and clears LS when server returns 500",
    { tag: ["@error", "@auth"] },
    async ({ page }) => {
      await page.goto(AUTHED_PAGE);

      await page.route("**/api/sico/rbac/logout", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ code: 500, msg: "server error" }),
        });
      });

      await clickLogoutAndTrackExpiryToast(page);
      await expectCleanLogin(page);

      const [token, user] = await page.evaluate(
        ([tokenKey, userKey]) => [
          // eslint-disable-next-line no-restricted-syntax -- e2e probe runs in browser context, wrapper unavailable
          localStorage.getItem(tokenKey as string),
          // eslint-disable-next-line no-restricted-syntax -- e2e probe runs in browser context, wrapper unavailable
          localStorage.getItem(userKey as string),
        ],
        [AUTH_TOKEN_LS, AUTH_USER_LS],
      );
      expect(token).toBeNull();
      expect(user).toBeNull();
    },
  );

  test(
    "logout treats an already-ended server session as clean completion",
    { tag: ["@error", "@auth"] },
    async ({ page }) => {
      await page.goto(AUTHED_PAGE);
      await page.route("**/api/sico/rbac/logout", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            code: 401,
            msg: "already logged out",
            data: null,
          }),
        });
      });

      await clickLogoutAndTrackExpiryToast(page);
      await expectCleanLogin(page);

      const authValues = await page.evaluate(
        (keys) =>
          keys.map((key) =>
            // eslint-disable-next-line no-restricted-syntax -- e2e probe runs in browser context, wrapper unavailable
            localStorage.getItem(key),
          ),
        [AUTH_TOKEN_LS, AUTH_USER_LS, AUTH_EXPIRES_AT_LS],
      );
      expect(authValues).toEqual([null, null, null]);
    },
  );
});

// REAL environment (@real): a genuine login then logout against the deployed
// app. No mocking — runs only when `SICO_E2E_URL` is set and admin creds exist.
test.describe("sidebar @real", () => {
  test(
    "real logout returns to /login",
    { tag: ["@core", "@auth"] },
    async ({ page }) => {
      skipWithoutCreds("admin");
      await realLogin(page, "admin");

      await clickLogoutAndTrackExpiryToast(page);
      await expectCleanLogin(page);
    },
  );
});
