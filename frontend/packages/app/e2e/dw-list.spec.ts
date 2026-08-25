import { expect, type Page, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";
import { AUTH_TOKEN_LS } from "@sico/shared/utils/local-storage.ts";

import { type AgentFixture, makeAgent } from "./fixtures/agent-fixtures";
import { realLogin, skipWithoutCreds } from "./fixtures/real-auth";
import { mockSicoApi, seedAuth } from "./fixtures/seed-auth";

// Per-test `page.route` overrides `mockSicoApi` (Playwright matches most-recent first).

async function mockAgentsRoute(
  page: Page,
  handler: (url: URL) => {
    status?: number;
    body: unknown;
  },
): Promise<void> {
  await page.route(
    "**/api/sico/agent/single_agent_instances*",
    async (route) => {
      const { status = 200, body } = handler(new URL(route.request().url()));
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    },
  );
}

const AGENTS: AgentFixture[] = [makeAgent(5, "Chloe"), makeAgent(6, "Daniel")];

// Mock cases live under one describe so the seeding `beforeEach` is sunk inside
// it — the `@real` describe at the bottom deliberately gets NO mock setup, so a
// top-level hook would wrongly intercept its live requests.
test.describe("digital worker list", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockSicoApi(page);
  });

  test(
    "renders cards and clicking the first opens the worker's home",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      await mockAgentsRoute(page, () => ({
        body: makeOkEnvelope({
          instances: AGENTS,
          total: AGENTS.length,
          hasNext: false,
        }),
      }));
      await page.goto("/digital-worker");

      const firstCard = page.getByRole("link", {
        name: "Open Chloe",
      });
      await expect(firstCard).toBeVisible();

      // A roster card links to the worker's home (`/digital-worker/$id`), the
      // launch pad — NOT directly into a `/collaboration/$conversationId`.
      await firstCard.click();
      await expect(page).toHaveURL(/\/digital-worker\/5$/);
    },
  );

  test(
    "first card is keyboard reachable: Tab → Enter navigates",
    { tag: ["@a11y", "@dw"] },
    async ({ page }) => {
      await mockAgentsRoute(page, () => ({
        body: makeOkEnvelope({
          instances: AGENTS,
          total: AGENTS.length,
          hasNext: false,
        }),
      }));
      await page.goto("/digital-worker");

      const firstCard = page.getByRole("link", {
        name: "Open Chloe",
      });
      await expect(firstCard).toBeVisible();

      await firstCard.focus();
      await expect(firstCard).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/digital-worker\/5$/);
    },
  );

  test(
    "every img inside the grid has an alt attribute (empty allowed for decorative)",
    { tag: ["@a11y", "@dw"] },
    async ({ page }) => {
      await mockAgentsRoute(page, () => ({
        body: makeOkEnvelope({
          instances: AGENTS,
          total: AGENTS.length,
          hasNext: false,
        }),
      }));
      await page.goto("/digital-worker");

      await expect(
        page.getByRole("link", { name: "Open Chloe" }),
      ).toBeVisible();

      const alts = await page
        .locator("main img")
        .evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt")));

      expect(alts.length).toBeGreaterThan(0);
      // Decorative imagery: alt attribute present, empty allowed.
      for (const alt of alts) {
        expect(alt).not.toBeNull();
      }
    },
  );

  test(
    "shows skeleton while the first page is in flight",
    { tag: ["@loading", "@dw"] },
    async ({ page }) => {
      // Delay so Suspense fallback is observable.
      await page.route(
        "**/api/sico/agent/single_agent_instances*",
        async (route) => {
          await new Promise((resolve) => {
            setTimeout(resolve, 2_000);
          });
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeOkEnvelope({
                instances: AGENTS,
                total: AGENTS.length,
                hasNext: false,
              }),
            ),
          });
        },
      );

      await page.goto("/digital-worker");
      await expect(
        page.getByRole("status", { name: "Loading digital workers" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Open Chloe" })).toBeVisible({
        timeout: 15_000,
      });
    },
  );

  test(
    "renders empty state when no digital workers exist",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      await mockAgentsRoute(page, () => ({
        body: makeOkEnvelope({ instances: [], total: 0, hasNext: false }),
      }));

      await page.goto("/digital-worker");
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Your crew is one hire away",
        }),
      ).toBeVisible();
    },
  );

  test(
    "renders error view with Try again button on 500",
    { tag: ["@error", "@dw"] },
    async ({ page }) => {
      await mockAgentsRoute(page, () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto("/digital-worker");
      // Query client retries 3× before throwing to ErrorBoundary; allow >5s default.
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        {
          timeout: 15_000,
        },
      );
    },
  );

  test(
    "infinite scroll loads more pages via sentinel",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      await page.route(
        "**/api/sico/agent/single_agent_instances*",
        async (route) => {
          const url = new URL(route.request().url());
          const requestedPage = Number(url.searchParams.get("page") ?? "1");
          if (requestedPage === 1) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(
                makeOkEnvelope({
                  instances: Array.from({ length: 3 }, (_, i) =>
                    makeAgent(i + 1, `Agent ${i + 1}`),
                  ),
                  total: 6,
                  hasNext: true,
                }),
              ),
            });
            return;
          }
          await new Promise((resolve) => {
            setTimeout(resolve, 2_000);
          });
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeOkEnvelope({
                instances: Array.from({ length: 3 }, (_, i) =>
                  makeAgent(i + 4, `Agent ${i + 4}`),
                ),
                total: 6,
                hasNext: false,
              }),
            ),
          });
        },
      );

      await page.goto("/digital-worker");
      await expect(
        page.getByRole("link", { name: "Open Agent 1" }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "Open Agent 3" })
        .scrollIntoViewIfNeeded();
      await expect(
        page.getByRole("link", { name: "Open Agent 6" }),
      ).toBeVisible();
    },
  );

  // ---- inserted-anchor ----
  test(
    "toggling 'Show inactive' refetches without the status filter and swaps the roster",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      // The grid footer's inactive toggle flips a server-side filter: the default
      // "hide inactive" list sends a `statusList` CSV (every status but INACTIVE);
      // clicking "Show inactive digital workers" refetches with NO statusList
      // (show all). Branch the mock on the param's presence to prove the wiring.
      await page.route(
        "**/api/sico/agent/single_agent_instances*",
        async (route) => {
          const url = new URL(route.request().url());
          const showingAll = !url.searchParams.has("statusList");
          const instances = showingAll
            ? [makeAgent(5, "Chloe"), makeAgent(9, "Dormant")]
            : [makeAgent(5, "Chloe")];
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeOkEnvelope({
                instances,
                total: instances.length,
                hasNext: false,
              }),
            ),
          });
        },
      );

      await page.goto("/digital-worker");
      // Default (hide inactive): only the active worker shows.
      await expect(
        page.getByRole("link", { name: "Open Chloe" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Open Dormant" }),
      ).toBeHidden();

      // Reveal inactive → refetch with no statusList → the dormant worker appears.
      await page
        .getByRole("button", { name: "Show inactive digital workers" })
        .click();
      await expect(
        page.getByRole("link", { name: "Open Dormant" }),
      ).toBeVisible();
    },
  );

  // Generic router/auth-persistence contracts, hosted on the /digital-worker
  // route (formerly authenticated-routing.spec). With identity in LS the SPA
  // must NOT call `/api/sico/me`; history + search params survive navigation.
  test.describe("routing behaviour (generic, hosted on /dw)", () => {
    test(
      "hard-reload on /digital-worker stays on /digital-worker (no /me request)",
      { tag: ["@key", "@dw"] },
      async ({ page }) => {
        const meRequests: string[] = [];
        page.on("request", (request) => {
          // Anchor with `/`/`?`/end so we don't over-match `/me-anything`.
          if (/\/api\/sico\/me(\/|\?|$)/.test(request.url())) {
            meRequests.push(request.url());
          }
        });

        await page.goto("/digital-worker");
        await expect(
          page.getByRole("heading", { level: 1, name: "Digital Worker" }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/digital-worker$/);

        // Hard reload — addInitScript re-runs, LS still seeded.
        await page.reload();
        await expect(
          page.getByRole("heading", { level: 1, name: "Digital Worker" }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/digital-worker$/);

        // No polling/SSE/ws today, so networkidle resolves deterministically.
        await page.waitForLoadState("networkidle");
        expect(meRequests).toEqual([]);
      },
    );

    test(
      "back/forward across <Link> navigation preserves history",
      { tag: ["@key", "@dw"] },
      async ({ page }) => {
        await page.goto("/this-route-does-not-exist");
        await expect(
          page.getByRole("heading", { level: 1, name: "Page not found" }),
        ).toBeVisible();

        await page.getByRole("link", { name: "Back to home" }).click();
        await expect(
          page.getByRole("heading", { level: 1, name: "Digital Worker" }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/digital-worker$/);

        await page.goBack();
        await expect(
          page.getByRole("heading", { level: 1, name: "Page not found" }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/this-route-does-not-exist$/);

        await page.goForward();
        await expect(
          page.getByRole("heading", { level: 1, name: "Digital Worker" }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/digital-worker$/);
      },
    );

    test(
      "deep-link to /digital-worker?foo=bar preserves search params",
      { tag: ["@key", "@dw"] },
      async ({ page }) => {
        await page.goto("/digital-worker?foo=bar");
        await expect(
          page.getByRole("heading", { level: 1, name: "Digital Worker" }),
        ).toBeVisible();

        await expect(page).toHaveURL(/\/digital-worker\?foo=bar$/);

        // Sanity-check the LS seed survived navigation.
        const token = await page.evaluate(
          // eslint-disable-next-line no-restricted-syntax -- e2e probe runs in browser context, wrapper unavailable
          (key) => localStorage.getItem(key),
          AUTH_TOKEN_LS,
        );
        expect(token).toBe("tok");
      },
    );
  });

  test(
    "add digital worker: filling the dialog and saving toasts success",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      // The list header's "Add Digital Worker" opens a create dialog: pick a
      // project → pick a DW template → name it → Save → POST
      // /agent/single_agent_instance → "Digital worker added." toast. This is the
      // list page's primary front↔back write, previously untested end-to-end.
      await mockAgentsRoute(page, () => ({
        body: makeOkEnvelope({
          instances: AGENTS,
          total: AGENTS.length,
          hasNext: false,
        }),
      }));
      // The dialog's Project select reads the non-suspense projects list…
      await page.route("**/api/sico/project/user_projects*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeOkEnvelope({
              projects: [
                {
                  id: 1,
                  name: "Aurora",
                  description: "",
                  iconUrl: "",
                  memberType: 3,
                  agentInstances: [],
                },
              ],
              total: 1,
              hasNext: false,
            }),
          ),
        });
      });
      // …and its DW select reads the studio template list (single_agent_infos).
      await page.route(
        "**/api/sico/agent/single_agent_infos*",
        async (route) => {
          expect(
            new URL(route.request().url()).searchParams.get("intent"),
          ).toBe("1");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeOkEnvelope({
                agentInfos: [
                  { agentId: "tmpl-1", name: "Nova", role: "Writer" },
                ],
              }),
            ),
          });
        },
      );
      // The create POST returns the freshly-minted instance.
      await page.route(
        /\/api\/sico\/agent\/single_agent_instance(?:\?|$)/,
        async (route) => {
          if (route.request().method() !== "POST") {
            await route.fallback();
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(makeOkEnvelope({ id: 77 })),
          });
        },
      );

      await page.goto("/digital-worker");
      await page.getByRole("button", { name: "Add Digital Worker" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Project select (Base UI): open the trigger, pick the option.
      await dialog.getByRole("combobox", { name: "Project" }).click();
      await page.getByRole("option", { name: "Aurora" }).click();
      // DW template select — picking it auto-fills Name from the template.
      await dialog.getByRole("combobox", { name: "Digital worker" }).click();
      await page.getByRole("option", { name: "Nova" }).click();

      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Digital worker added.")).toBeVisible();
    },
  );
});

// REAL environment (@real): the read-only digital-worker roster on live data
// after a genuine admin login. No mocking — runs only when `SICO_E2E_URL` is
// set. Structural assertions only (h1 mounts, no error boundary, first card is a
// real link that navigates) so they survive real-data drift.
test.describe("digital worker list @real", () => {
  test(
    "real /digital-worker renders the roster shell",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      skipWithoutCreds("admin");
      await realLogin(page, "admin");

      await page.goto("/digital-worker", { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/digital-worker(?:\?|$)/);
      await expect(
        page.getByRole("heading", { level: 1, name: "Digital Worker" }),
      ).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  test(
    "real: opening the first digital worker navigates to its conversation",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      skipWithoutCreds("admin");
      await realLogin(page, "admin");
      await page.goto("/digital-worker", { waitUntil: "networkidle" });

      // Read-only navigation: click the first roster card (an "Open <name>"
      // link) and assert we land on that worker's route. The id is drift-proof
      // (any numeric agent id), never a locked literal.
      const firstCard = page.getByRole("link", { name: /^Open / }).first();
      // A brand-new admin account may have zero workers — skip rather than fail
      // on an environment-dependent empty roster.
      test.skip(
        (await firstCard.count()) === 0,
        "No digital workers on this real account",
      );
      await firstCard.click();
      await expect(page).toHaveURL(/\/digital-worker\/\d+/);
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );
});
