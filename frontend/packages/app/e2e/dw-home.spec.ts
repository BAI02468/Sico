import { expect, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

import { mockAgentDetail } from "./fixtures/agent-fixtures";
import { realLogin, skipWithoutCreds } from "./fixtures/real-auth";
import { mockSicoApi, seedAuth } from "./fixtures/seed-auth";

// Core path C5: the Digital Worker HOME page (`/digital-worker/$id` index) is a
// launch pad — typing a message and sending mints a fresh conversation
// (POST /conversation) and navigates to /collaboration/$conversationId (replace).
// This is a user's first 0→1 action with a worker; the existing collaboration
// specs only cover an ALREADY-open conversation, leaving this spine step untested.

const HOME_URL = "/digital-worker/5";
const NEW_CONVERSATION_ID = 4242;

test.describe("digital worker home", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockSicoApi(page);
    await mockAgentDetail(page);
  });

  test(
    "home: sending a message creates a conversation and navigates to it",
    {
      tag: ["@core", "@dw"],
    },
    async ({ page }) => {
      // The create-first POST /conversation returns the freshly-minted summary; the
      // home parks the message then navigates to /collaboration/$id.
      await page.route("**/api/sico/conversation", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeOkEnvelope({ id: NEW_CONVERSATION_ID, title: "New Session" }),
          ),
        });
      });

      await page.goto(HOME_URL);

      // The home composer shares the chat <Composer> — same accessible labels.
      const input = page.getByLabel("Message input");
      await expect(input).toBeVisible();
      await input.fill("Draft the Q3 launch brief");

      // Send button only appears once there is text (showSend={hasText}).
      await page.getByRole("button", { name: "Send message" }).click();

      // On success the route navigates (replace) to the new conversation.
      await expect(page).toHaveURL(
        new RegExp(`/digital-worker/5/collaboration/${NEW_CONVERSATION_ID}`),
      );
    },
  );

  test(
    "home: a failed create keeps the draft and toasts",
    {
      tag: ["@error", "@dw"],
    },
    async ({ page }) => {
      await page.route("**/api/sico/conversation", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ code: 500, msg: "server error", data: {} }),
        });
      });

      await page.goto(HOME_URL);
      const input = page.getByLabel("Message input");
      await input.fill("Draft the Q3 launch brief");
      await page.getByRole("button", { name: "Send message" }).click();

      // The draft survives (no navigation, composer does not clear on the error path).
      await expect(page).toHaveURL(/\/digital-worker\/5$/);
      await expect(input).toHaveValue("Draft the Q3 launch brief");
      await expect(
        page.getByText("Couldn't start a conversation. Please try again."),
      ).toBeVisible();
    },
  );

  test(
    "home: selecting a suggested task prefills the composer",
    {
      tag: ["@key", "@dw"],
    },
    async ({ page }) => {
      // The empty-state home fetches onboarding suggestions (POST /conversation/
      // onboard/recommendation_tasks) and lists them as buttons; clicking one calls
      // onSelect(task.message), which prefills the shared composer. Covers the
      // onboarding fetch → prefill spine step (send itself is the core test above).
      await page.route(
        "**/api/sico/conversation/onboard/recommendation_tasks",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeOkEnvelope({
                tasks: [
                  { message: "Summarize this week's incidents", icon: 5 },
                ],
              }),
            ),
          });
        },
      );

      await page.goto(HOME_URL);
      // The suggested task renders as a button carrying its message text.
      await page
        .getByRole("button", { name: "Summarize this week's incidents" })
        .click();

      // Clicking prefills the composer with the task message.
      await expect(page.getByLabel("Message input")).toHaveValue(
        "Summarize this week's incidents",
      );
    },
  );
});

// REAL environment (@real): the DW home on live data after a genuine admin
// login. No mocking — runs only when `SICO_E2E_URL` is set. Mostly read-only
// (composer mounts, suggested-task prefill); the one write is the `@core` twin
// of the mock "send → creates a conversation" flow — a real send mints a
// conversation (no clean teardown, accepted, minimal footprint). Skips if the
// account has no workers.
test.describe("digital worker home @real", () => {
  test(
    "real: the first worker's home renders its composer",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      skipWithoutCreds("admin");
      await realLogin(page, "admin");
      await page.goto("/digital-worker", { waitUntil: "networkidle" });

      const firstCard = page.getByRole("link", { name: /^Open / }).first();
      test.skip(
        (await firstCard.count()) === 0,
        "No digital workers on this real account",
      );
      await firstCard.click();

      // Landed on a worker route; the home composer is the launch pad.
      await expect(page).toHaveURL(/\/digital-worker\/\d+/);
      await expect(page.getByLabel("Message input")).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  test(
    "real: a suggested task prefills the composer when onboarding offers one",
    { tag: ["@key", "@dw"] },
    async ({ page }) => {
      // The empty-state home fetches onboarding suggestions (POST /conversation/
      // onboard/recommendation_tasks) and lists them as buttons under a
      // "Suggested tasks" heading. Real onboarding is account/worker dependent —
      // if the fetch returns none (or the worker already has history), the
      // section is absent, so skip rather than fail. Read-only: clicking only
      // prefills the composer; it does NOT send.
      skipWithoutCreds("admin");
      await realLogin(page, "admin");
      await page.goto("/digital-worker", { waitUntil: "networkidle" });

      const firstCard = page.getByRole("link", { name: /^Open / }).first();
      test.skip(
        (await firstCard.count()) === 0,
        "No digital workers on this real account",
      );
      await firstCard.click();
      await expect(page.getByLabel("Message input")).toBeVisible();

      // The suggestions render under the "Suggested tasks" heading; give the
      // onboarding fetch room, then skip if this worker surfaces none.
      const heading = page.getByText("Suggested tasks", { exact: true });
      await heading.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {
        // no-op — absence is handled by the skip below
      });
      test.skip(
        (await heading.count()) === 0,
        "No suggested tasks for this real worker",
      );

      // Task rows are buttons that are siblings of the heading inside the
      // suggestions container (suggested-tasks.tsx). Scope to that container (the
      // heading's grandparent div) so we never grab the composer / header button.
      const suggestions = heading.locator("xpath=ancestor::div[1]/..");
      const taskButton = suggestions.getByRole("button").first();
      const label = (await taskButton.innerText()).trim();
      await taskButton.click();

      // Clicking prefills the composer with the task's message text.
      await expect(page.getByLabel("Message input")).toHaveValue(
        new RegExp(label.slice(0, 12).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );

  test(
    "real: sending from home creates a conversation and navigates to it",
    { tag: ["@core", "@dw"] },
    async ({ page }) => {
      // The @core twin of the mock "send → creates a conversation" flow, on live
      // data. Typing + Send from the worker home mints a real conversation
      // (POST /conversation) and navigates into /collaboration/$id. Structural
      // only — assert the landed URL, not any reply text. This is the one real
      // WRITE here; it leaves a conversation behind (accepted, minimal footprint,
      // no clean teardown for conversations). Skips if the account has no workers.
      skipWithoutCreds("admin");
      await realLogin(page, "admin");
      await page.goto("/digital-worker", { waitUntil: "networkidle" });

      const firstCard = page.getByRole("link", { name: /^Open / }).first();
      test.skip(
        (await firstCard.count()) === 0,
        "No digital workers on this real account",
      );
      await firstCard.click();

      const input = page.getByLabel("Message input");
      await expect(input).toBeVisible();
      await input.fill("Hello from an E2E smoke test.");
      await page.getByRole("button", { name: "Send message" }).click();

      // The send mints a conversation and navigates into it.
      await expect(page).toHaveURL(/\/collaboration\/\d+/, { timeout: 30_000 });
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );
});
