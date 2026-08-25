import { expect, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

import {
  makeKnowledgeTag,
  makeProjectDetail,
  mockEndpoint,
} from "./fixtures/project-fixtures";
import { realLogin, skipWithoutCreds } from "./fixtures/real-auth";
import { mockSicoApi, seedAuth } from "./fixtures/seed-auth";

// Writes hit `/knowledge/tag` (singular) — the anchored `mockEndpoint` keeps it
// distinct from the `/knowledge/tags` list.

const KNOWLEDGE_TAGS_URL = "/project/1/knowledge-tags";

// Seed the knowledge-tags list. Default one row; pass `[]` for the empty state.
// `KnowledgeTagsContent` also suspends on `useProjectDetailQuery` (the page
// header + h1 read `project.name`), so the `/project` detail must resolve from a
// typed envelope too — otherwise the catch-all `{}` fails the parse and the page
// stays wedged on its "Loading knowledge tags" skeleton.
async function mockKnowledgeTagsList(
  page: Parameters<typeof mockEndpoint>[0],
  rows: Record<string, unknown>[],
): Promise<void> {
  await mockEndpoint(page, "project", () => ({
    body: makeOkEnvelope(makeProjectDetail(1)),
  }));
  await mockEndpoint(page, "knowledge/tags", () => ({
    body: makeOkEnvelope({ tags: rows, total: rows.length }),
  }));
}

test.describe("knowledge tags", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockSicoApi(page);
  });

  test(
    "renders the knowledge-tags table once loaded",
    { tag: ["@key", "@knowledge"] },
    async ({ page }) => {
      await mockKnowledgeTagsList(page, [
        makeKnowledgeTag(1, { name: "Invoice triage" }),
      ]);

      await page.goto(KNOWLEDGE_TAGS_URL);
      await expect(
        page.getByRole("heading", { level: 1, name: "Knowledge Tags" }),
      ).toBeVisible();
      await expect(page.getByText("Invoice triage")).toBeVisible();
    },
  );

  test(
    "shows the knowledge-tags skeleton while the query is in flight",
    { tag: ["@loading", "@knowledge"] },
    async ({ page }) => {
      // The h1 assertion below also needs the `/project` detail to resolve.
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(makeProjectDetail(1)),
      }));
      // Delay so the Suspense fallback is observable.
      await page.route("**/api/sico/knowledge/tags*", async (route) => {
        await new Promise((resolve) => {
          setTimeout(resolve, 2_000);
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeOkEnvelope({ tags: [makeKnowledgeTag(1)], total: 1 }),
          ),
        });
      });

      await page.goto(KNOWLEDGE_TAGS_URL);
      await expect(
        page.getByRole("status", { name: "Loading knowledge tags" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 1, name: "Knowledge Tags" }),
      ).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    "renders the error view with Try again when the list 500s",
    { tag: ["@error", "@knowledge"] },
    async ({ page }) => {
      await mockEndpoint(page, "knowledge/tags", () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto(KNOWLEDGE_TAGS_URL);
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        {
          timeout: 15_000,
        },
      );
    },
  );

  test(
    "renders the empty state when there are no knowledge tags",
    { tag: ["@key", "@knowledge"] },
    async ({ page }) => {
      await mockKnowledgeTagsList(page, []);

      await page.goto(KNOWLEDGE_TAGS_URL);
      await expect(
        page.getByRole("heading", { level: 2, name: "No knowledge tags yet" }),
      ).toBeVisible();
    },
  );

  test(
    "add knowledge tag: saving surfaces the success toast",
    { tag: ["@key", "@knowledge"] },
    async ({ page }) => {
      await mockKnowledgeTagsList(page, []);
      await mockEndpoint(page, "knowledge/tag", () => ({
        body: makeOkEnvelope({ id: 42 }),
      }));

      await page.goto(KNOWLEDGE_TAGS_URL);
      await page.getByRole("button", { name: "Add knowledge tag" }).click();

      const dialog = page.getByRole("dialog", { name: "Add knowledge tag" });
      await expect(dialog).toBeVisible();
      await dialog.locator("#edit-knowledge-tag-name").fill("Refunds");
      await dialog
        .locator("#edit-knowledge-tag-when-to-use")
        .fill("Use when handling refund requests.");
      await dialog.getByRole("button", { name: "Save" }).click();

      await expect(page.getByText("Knowledge tag saved.")).toBeVisible();
    },
  );

  test(
    "delete knowledge tag: confirming surfaces the success toast",
    { tag: ["@key", "@knowledge"] },
    async ({ page }) => {
      await mockKnowledgeTagsList(page, [
        makeKnowledgeTag(3, { name: "Stale tag" }),
      ]);
      await mockEndpoint(page, "knowledge/tag", () => ({
        body: makeOkEnvelope({}),
      }));

      await page.goto(KNOWLEDGE_TAGS_URL);
      await page.getByRole("button", { name: "Knowledge tag actions" }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();

      const confirm = page.getByRole("dialog", {
        name: "Delete this knowledge tag?",
      });
      await expect(confirm).toBeVisible();
      await confirm
        .getByRole("button", { name: "Delete", exact: true })
        .click();

      await expect(page.getByText("Knowledge tag deleted.")).toBeVisible();
    },
  );

  test(
    "edit knowledge tag: the dialog pre-fills and saving toasts",
    { tag: ["@key", "@knowledge"] },
    async ({ page }) => {
      await mockKnowledgeTagsList(page, [
        makeKnowledgeTag(7, {
          name: "Refund flow",
          description: "Handle refunds.",
        }),
      ]);
      // edit → PUT /knowledge/tag → ok envelope (no id).
      await mockEndpoint(page, "knowledge/tag", () => ({
        body: makeOkEnvelope({}),
      }));

      await page.goto(KNOWLEDGE_TAGS_URL);
      await page.getByRole("button", { name: "Knowledge tag actions" }).click();
      await page.getByRole("menuitem", { name: "Edit" }).click();

      const dialog = page.getByRole("dialog", { name: "Edit knowledge tag" });
      await expect(dialog).toBeVisible();
      // Edit mode seeds both fields from the row.
      await expect(dialog.locator("#edit-knowledge-tag-name")).toHaveValue(
        "Refund flow",
      );
      await expect(
        dialog.locator("#edit-knowledge-tag-when-to-use"),
      ).toHaveValue("Handle refunds.");

      await dialog.locator("#edit-knowledge-tag-name").fill("Refund flow v2");
      await dialog.getByRole("button", { name: "Save" }).click();

      await expect(page.getByText("Knowledge tag saved.")).toBeVisible();
    },
  );

  test(
    "add knowledge tag: a failed save keeps the dialog open and toasts",
    { tag: ["@error", "@knowledge"] },
    async ({ page }) => {
      await mockKnowledgeTagsList(page, []);
      await mockEndpoint(page, "knowledge/tag", () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto(KNOWLEDGE_TAGS_URL);
      await page.getByRole("button", { name: "Add knowledge tag" }).click();

      const dialog = page.getByRole("dialog", { name: "Add knowledge tag" });
      await dialog.locator("#edit-knowledge-tag-name").fill("Refunds");
      await dialog.getByRole("button", { name: "Save" }).click();

      await expect(
        page.getByText("We couldn't save your changes. Try again."),
      ).toBeVisible();
      // The dialog stays open so the user's input survives for a retry.
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("#edit-knowledge-tag-name")).toHaveValue(
        "Refunds",
      );
    },
  );

  test(
    "delete knowledge tag: a failed delete keeps the confirm open and toasts",
    { tag: ["@error", "@knowledge"] },
    async ({ page }) => {
      await mockKnowledgeTagsList(page, [
        makeKnowledgeTag(3, { name: "Stale tag" }),
      ]);
      await mockEndpoint(page, "knowledge/tag", () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto(KNOWLEDGE_TAGS_URL);
      await page.getByRole("button", { name: "Knowledge tag actions" }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();

      const confirm = page.getByRole("dialog", {
        name: "Delete this knowledge tag?",
      });
      await confirm
        .getByRole("button", { name: "Delete", exact: true })
        .click();

      await expect(
        page.getByText("We couldn't delete this knowledge tag. Try again."),
      ).toBeVisible();
      // The confirm stays open for a retry rather than freezing silently.
      await expect(confirm).toBeVisible();
    },
  );

  test(
    "add knowledge tag: Name input hard-caps at 20 characters",
    { tag: ["@key", "@knowledge"] },
    async ({ page }) => {
      await mockKnowledgeTagsList(page, []);
      await mockEndpoint(page, "knowledge/tag", () => ({
        body: makeOkEnvelope({ id: 42 }),
      }));

      await page.goto(KNOWLEDGE_TAGS_URL);
      await page.getByRole("button", { name: "Add knowledge tag" }).click();

      const dialog = page.getByRole("dialog", { name: "Add knowledge tag" });
      const name = dialog.locator("#edit-knowledge-tag-name");
      // `pressSequentially` (not `fill`) so the browser enforces maxLength per key.
      await name.pressSequentially("a".repeat(25));

      await expect(name).toHaveValue("a".repeat(20));
      await expect(dialog.getByText("20/20")).toBeVisible();

      // The capped value is valid, so the save still goes through.
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Knowledge tag saved.")).toBeVisible();
    },
  );
});

// REAL environment (@real): a self-contained create→assert→delete cycle against
// LIVE data on /project/80. It makes its OWN uniquely-named row and removes ONLY
// that row — it never touches the project's pre-existing tags. No mocking; runs
// only when `SICO_E2E_URL` is set. `afterEach` best-effort cleanup guards against
// a mid-test crash leaving litter behind.
const READONLY_PROJECT = "/project/80";
const REAL_KNOWLEDGE_TAGS_URL = `${READONLY_PROJECT}/knowledge-tags`;

// Delete the temp tag row if present. Best-effort: swallows errors so cleanup
// never fails the test itself. Reused by the happy path and the afterEach guard.
async function deleteTagByName(
  page: import("@playwright/test").Page,
  name: string,
): Promise<void> {
  const row = page.getByRole("row", { name: new RegExp(name) });
  if ((await row.count().catch(() => 0)) === 0) {
    return;
  }
  await row
    .first()
    .getByRole("button", { name: "Knowledge tag actions" })
    .click()
    .catch(() => {});
  await page
    .getByRole("menuitem", { name: "Delete" })
    .click()
    .catch(() => {});
  const confirm = page.getByRole("dialog", {
    name: "Delete this knowledge tag?",
  });
  await confirm
    .getByRole("button", { name: "Delete", exact: true })
    .click()
    .catch(() => {});
  await expect(row)
    .toHaveCount(0)
    .catch(() => {});
}

test.describe("knowledge tags @real", () => {
  // A distinct name per worker so parallel shards never collide; the timestamp
  // makes reruns unique too. (Runs in the Playwright node process, where
  // Date.now is available.)
  let tempName = "";

  test.afterEach(async ({ page }) => {
    // Best-effort litter removal if the happy path failed before its own delete.
    if (tempName) {
      await deleteTagByName(page, tempName);
    }
  });

  test(
    "create a knowledge tag then delete only that tag",
    { tag: ["@key", "@knowledge"] },
    async ({ page }, testInfo) => {
      skipWithoutCreds("admin");
      // The name field hard-caps at 20 chars, so keep the unique name short
      // enough to survive un-truncated (else row-name matching misses). base36
      // timestamp + worker index stays ~15 chars and is collision-safe.
      tempName = `e2e-w${testInfo.workerIndex}-${Date.now().toString(36)}`;

      await realLogin(page, "admin");
      await page.goto(REAL_KNOWLEDGE_TAGS_URL, { waitUntil: "networkidle" });

      // CREATE
      await page.getByRole("button", { name: "Add knowledge tag" }).click();
      const dialog = page.getByRole("dialog", { name: "Add knowledge tag" });
      await expect(dialog).toBeVisible();
      await dialog.locator("#edit-knowledge-tag-name").fill(tempName);
      await dialog
        .locator("#edit-knowledge-tag-when-to-use")
        .fill("Temporary E2E tag — safe to delete.");
      await dialog.getByRole("button", { name: "Save" }).click();

      // ASSERT it appears (real API round-trip → generous timeout)
      const row = page.getByRole("row", { name: new RegExp(tempName) });
      await expect(row).toBeVisible({ timeout: 15_000 });

      // DELETE only our row
      await row
        .first()
        .getByRole("button", { name: "Knowledge tag actions" })
        .click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      const confirm = page.getByRole("dialog", {
        name: "Delete this knowledge tag?",
      });
      await expect(confirm).toBeVisible();
      await confirm
        .getByRole("button", { name: "Delete", exact: true })
        .click();

      // ASSERT it's gone
      await expect(row).toHaveCount(0, { timeout: 15_000 });
      tempName = ""; // deleted cleanly → afterEach has nothing to do
    },
  );
});
