import { expect, type Page, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

import { mockHistory } from "./fixtures/agent-fixtures";
import { makeProjectDetail, mockEndpoint } from "./fixtures/project-fixtures";
import { mockSicoApi, seedAuth } from "./fixtures/seed-auth";

// E2E for the sandbox (Device) previewer: open it from the collaboration
// Header's Device button, then drive the four states its `/sandbox/instance`
// poll resolves into — loading, success (device grid), error (retry), and
// empty. The Device button itself only renders when the agent detail carries a
// non-empty `sandboxes`, so every test seeds that first.
//
// Standardization note (mock-only, no `@real` twin): the four states here are
// exactly the ones a live backend CANNOT stage deterministically — the device
// list depends on whichever sandboxes happen to be provisioned at run time, so a
// real assertion would be inherently flaky (empty vs. N devices vs. mid-boot).
// Per the follow-up principle (leave `@error`/`@loading`/boundary as mock-only;
// don't lock live data) sandbox stays mock-only.

const AGENT_ID = 5;
const COLLAB_URL = `/digital-worker/${AGENT_ID}/collaboration`;

// A sandbox device row as the wire sends it (sandboxSchema): a live `status`
// keeps it past the query's status filter; `vncUrl` is an https stub (the
// previewer hard-gates the url to https) pointed at a dead host so the iframe
// never paints real content.
function device(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sandboxId: "sb-1",
    displayName: "Pixel 7",
    type: "emulator",
    status: "in_use",
    vncUrl: "https://vnc.invalid/view",
    ...overrides,
  };
}

// Agent detail must carry `sandboxes` (count only — the button gates on length)
// so the Device button renders at all.
async function mockAgentWithDevices(page: Page): Promise<void> {
  await page.route(
    /\/api\/sico\/agent\/single_agent_instance\?/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeOkEnvelope({
            instance: {
              id: AGENT_ID,
              name: "Chloe",
              role: "Role",
              iconUri: "",
              sandboxes: [{}],
            },
          }),
        ),
      });
    },
  );
}

// Register a `/sandbox/instance` handler. `handler` returns the fulfill shape so
// each test picks its own status/body (or hangs by never resolving).
async function mockSandbox(
  page: Page,
  handler: (route: import("@playwright/test").Route) => Promise<void> | void,
): Promise<void> {
  await page.route(/\/api\/sico\/sandbox\/instance\?/, handler);
}

// Open the collaboration page and click the Device button to mount the sandbox
// previewer. The button is icon-only — found by its `aria-label`.
async function openSandbox(page: Page): Promise<void> {
  await mockAgentWithDevices(page);
  await mockHistory(page);
  await page.goto(COLLAB_URL);
  await page.getByRole("button", { name: "Device" }).click();
}

test.beforeEach(async ({ page }) => {
  await seedAuth(page);
  await mockSicoApi(page);
});

test.describe("sandbox previewer states", () => {
  test(
    "shows a spinner while the device list is loading",
    { tag: ["@loading", "@sandbox"] },
    async ({ page }) => {
      // Hold `/sandbox/instance` open so the pending spinner stays mounted.
      await mockSandbox(page, () => new Promise(() => {}));
      await openSandbox(page);

      await expect(page.getByLabel("Loading devices")).toBeVisible();
    },
  );

  test(
    "renders the device grid on a successful list",
    { tag: ["@key", "@sandbox"] },
    async ({ page }) => {
      await mockSandbox(page, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeOkEnvelope({
              items: [
                device({ sandboxId: "a", displayName: "Pixel 7" }),
                device({ sandboxId: "b", displayName: "Galaxy S24" }),
              ],
            }),
          ),
        });
      });
      await openSandbox(page);

      // Two devices → the grid lists both by name.
      await expect(page.getByText("Pixel 7")).toBeVisible();
      await expect(page.getByText("Galaxy S24")).toBeVisible();
    },
  );

  test(
    "shows the error state with retry when the list fails",
    { tag: ["@error", "@sandbox"] },
    async ({ page }) => {
      await mockSandbox(page, async (route) => {
        await route.fulfill({ status: 500, body: "boom" });
      });
      await openSandbox(page);

      // react-query retries a failed query 3× (1s + 2s + 4s back-off) before it
      // surfaces `isError`, so the ErrorView only appears after ~7s — give the
      // assertion room past that retry chain.
      await expect(
        page.getByRole("button", { name: /try again/i }),
      ).toBeVisible({
        timeout: 15_000,
      });
    },
  );

  test(
    "shows the empty state when no live devices remain",
    { tag: ["@key", "@sandbox"] },
    async ({ page }) => {
      await mockSandbox(page, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeOkEnvelope({ items: [] })),
        });
      });
      await openSandbox(page);

      await expect(page.getByText("No devices available.")).toBeVisible();
    },
  );
});

// --- Dedicated full-page sandbox route (`/project/$projectId/sandbox`) --------
// Distinct from the collaboration-embedded previewer above: this route has its
// own loader (`projectDevicesQueryOptions` → GET /sandbox/list), a project-detail
// breadcrumb, a page-level Suspense/ErrorBoundary, and a `notFound()` guard on a
// non-numeric projectId. Reads only (device writes are live-nondeterministic and
// stay out of E2E), so mock-only — the states here (grid render, route notFound)
// are the ones mocking can stage deterministically.
test.describe("sandbox route (full page)", () => {
  const SANDBOX_URL = "/project/1/sandbox";

  // A `/sandbox/list` row as the wire sends it (snake_case), bucketed by type.
  function wireDevice(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      sandbox_id: "sb-1",
      display_name: "Pixel 7",
      type: "emulator",
      status: "in_use",
      allocatable: true,
      organization_id: 1,
      project_id: 1,
      instance_id: "",
      instance_name: "",
      vnc_url: "https://vnc.invalid/view",
      ...overrides,
    };
  }

  test(
    "renders the device grid for the project",
    { tag: ["@key", "@sandbox"] },
    async ({ page }) => {
      // The page suspends on the project detail (breadcrumb) + the device list.
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(makeProjectDetail(1, { name: "Acme" })),
      }));
      await page.route(/\/api\/sico\/sandbox\/list\?/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeOkEnvelope({
              emulator: [
                wireDevice({ sandbox_id: "a", display_name: "Pixel 7" }),
                wireDevice({ sandbox_id: "b", display_name: "Galaxy S24" }),
              ],
            }),
          ),
        });
      });

      await page.goto(SANDBOX_URL);
      // The page h1 is the "Devices" title.
      await expect(
        page.getByRole("heading", { level: 1, name: "Devices" }),
      ).toBeVisible();
      // Both devices render in the table.
      await expect(page.getByText("Pixel 7")).toBeVisible();
      await expect(page.getByText("Galaxy S24")).toBeVisible();
    },
  );

  test(
    "a non-numeric projectId hits the route's notFound guard",
    { tag: ["@error", "@sandbox"] },
    async ({ page }) => {
      // `beforeLoad` parses `projectId` with a positive-int schema and throws
      // `notFound()` on failure → the router's 404 page, not the sandbox shell.
      await page.goto("/project/not-a-number/sandbox");
      await expect(
        page.getByRole("heading", { level: 1, name: "Page not found" }),
      ).toBeVisible();
    },
  );
});
