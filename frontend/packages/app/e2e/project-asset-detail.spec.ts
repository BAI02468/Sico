import { expect, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

import {
  makeDeliverable,
  makeKnowledgeDocument,
  makePlaybook,
  makeProjectDetail,
  mockEndpoint,
} from "./fixtures/project-fixtures";
import { realLogin, skipWithoutCreds } from "./fixtures/real-auth";
import { mockSicoApi, seedAuth } from "./fixtures/seed-auth";

// E2E for `/project/$projectId/knowledge/$assetId` — the read-only knowledge
// detail. The route owns the Suspense + ErrorBoundary; the resolved detail
// merges `GET /knowledge/document` (the row) with `GET /knowledge/document/
// details` (the body), so BOTH must be mocked. The right panel's tag area
// additionally Suspends on `GET /knowledge/tags`. The header breadcrumb reads
// `GET /project` for the owning project's name. The row's `status` must be 3
// (INGESTED) or the readiness guard redirects to the project workspace before
// the detail renders.

const ASSET_URL = "/project/1/knowledge/7";

// Mock the two detail reads + the panel's tag list + the owning project (the
// breadcrumb label) — what a loaded detail page needs. `status` defaults to
// INGESTED in `makeKnowledgeDocument`.
async function mockDetailSuccess(
  page: Parameters<typeof mockEndpoint>[0],
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await mockEndpoint(page, "knowledge/document", () => ({
    body: makeOkEnvelope({ document: makeKnowledgeDocument(7, overrides) }),
  }));
  await mockEndpoint(page, "knowledge/document/details", () => ({
    body: makeOkEnvelope({
      summary: "A short summary of the document.",
      fullText: "# Document body\n\nSome content.",
    }),
  }));
  await mockEndpoint(page, "knowledge/tags", () => ({
    body: makeOkEnvelope({ tags: [], total: 0 }),
  }));
  await mockEndpoint(page, "project", () => ({
    body: makeOkEnvelope(makeProjectDetail(1)),
  }));
}

test.describe("project asset detail", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockSicoApi(page);
  });

  test(
    "renders the knowledge detail panel once loaded",
    { tag: ["@key", "@knowledge"] },
    async ({ page }) => {
      await mockDetailSuccess(page, { name: "Quarterly Report" });

      await page.goto(ASSET_URL);
      const panel = page.getByRole("region", { name: "Detail" });
      await expect(panel).toBeVisible();
      // The name appears twice (article heading + panel); scope to the panel.
      await expect(panel.getByText("Quarterly Report")).toBeVisible();
      await expect(
        page.getByText("A short summary of the document."),
      ).toBeVisible();
    },
  );

  test(
    "shows the asset skeleton while the detail query is in flight",
    { tag: ["@loading", "@knowledge"] },
    async ({ page }) => {
      // Delay the document read ~2s so the route's Suspense fallback is observable.
      await mockEndpoint(page, "knowledge/document/details", () => ({
        body: makeOkEnvelope({ summary: "s", fullText: "# b" }),
      }));
      await mockEndpoint(page, "knowledge/tags", () => ({
        body: makeOkEnvelope({ tags: [], total: 0 }),
      }));
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(makeProjectDetail(1)),
      }));
      // Anchored regex (`document?` but never `document/details`) with a 2s delay.
      await page.route(
        /\/api\/sico\/knowledge\/document(?:\?|$)/,
        async (route) => {
          await new Promise((resolve) => {
            setTimeout(resolve, 2_000);
          });
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeOkEnvelope({ document: makeKnowledgeDocument(7) }),
            ),
          });
        },
      );

      await page.goto(ASSET_URL);
      await expect(
        page.getByRole("status", { name: "Loading asset" }),
      ).toBeVisible();
      await expect(page.getByRole("region", { name: "Detail" })).toBeVisible({
        timeout: 15_000,
      });
    },
  );

  test(
    "renders the error view with Try again when the document 500s",
    { tag: ["@error", "@knowledge"] },
    async ({ page }) => {
      await mockEndpoint(page, "knowledge/document", () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto(ASSET_URL);
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        {
          timeout: 15_000,
        },
      );
    },
  );

  test(
    "delete knowledge: confirming surfaces the success toast",
    { tag: ["@key", "@knowledge"] },
    async ({ page }) => {
      // One `/knowledge/document` route serves both verbs: a GET (has `id`) returns
      // the row; the DELETE returns an ok envelope. Success navigates back to the
      // overview, so its endpoints are stubbed empty too.
      await mockEndpoint(page, "knowledge/document/details", () => ({
        body: makeOkEnvelope({ summary: "s", fullText: "# b" }),
      }));
      await mockEndpoint(page, "knowledge/tags", () => ({
        body: makeOkEnvelope({ tags: [], total: 0 }),
      }));
      await mockEndpoint(page, "knowledge/document", (url) =>
        url.searchParams.has("id")
          ? {
              body: makeOkEnvelope({
                document: makeKnowledgeDocument(7, { name: "Stale Doc" }),
              }),
            }
          : { body: makeOkEnvelope({}) },
      );
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope({
          id: 1,
          name: "Acme",
          description: "",
          iconUrl: "",
          memberType: 1,
          agentInstances: [],
          ownerUsername: "o@b.test",
          creatorUsername: "c@b.test",
          operatorAdmins: [],
          createdAt: 1,
          updatedAt: 1,
        }),
      }));
      await mockEndpoint(page, "knowledge/documents", () => ({
        body: makeOkEnvelope({ documents: [], total: 0 }),
      }));
      await mockEndpoint(page, "knowledge/playbooks", () => ({
        body: makeOkEnvelope({ playbooks: [], total: 0 }),
      }));
      // Delete is permission-gated: the actions menu's Delete item is disabled
      // unless the user holds a manage role. Grant project_admin so it's enabled.
      await mockEndpoint(page, "rbac/user_roles", () => ({
        body: makeOkEnvelope({
          roles: [
            {
              roleCode: "project_admin",
              scopeType: "project",
              scopeId: 1,
              userId: 1,
            },
          ],
          total: 1,
        }),
      }));

      await page.goto(ASSET_URL);
      await expect(page.getByRole("region", { name: "Detail" })).toBeVisible();

      await page.getByRole("button", { name: "Asset actions" }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();

      const confirm = page.getByRole("dialog", { name: "Delete Knowledge" });
      await expect(confirm).toBeVisible();
      await confirm
        .getByRole("button", { name: "Delete", exact: true })
        .click();

      await expect(page.getByText('"Stale Doc" was deleted.')).toBeVisible();
    },
  );

  test(
    "drops only the tag area when the tag source fails",
    { tag: ["@error", "@knowledge"] },
    async ({ page }) => {
      // The asset itself loads, but the knowledge-tag source 500s. The tag area's
      // local boundary renders nothing — the rest of the panel must survive.
      await mockEndpoint(page, "knowledge/document", () => ({
        body: makeOkEnvelope({
          document: makeKnowledgeDocument(7, { name: "Quarterly Report" }),
        }),
      }));
      await mockEndpoint(page, "knowledge/document/details", () => ({
        body: makeOkEnvelope({
          summary: "A short summary.",
          fullText: "# Body",
        }),
      }));
      await mockEndpoint(page, "knowledge/tags", () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(makeProjectDetail(1)),
      }));

      await page.goto(ASSET_URL);

      // The rest of the Detail panel still renders…
      const panel = page.getByRole("region", { name: "Detail" });
      await expect(panel).toBeVisible();
      await expect(panel.getByText("Quarterly Report")).toBeVisible();
      // …but the failed tag area shows neither its label nor a page-level error.
      await expect(page.getByText("Knowledge tag")).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Try again" }),
      ).toBeHidden();
    },
  );

  test(
    "experience detail renders under its project route with a Detail panel",
    { tag: ["@key", "@project"] },
    async ({ page }) => {
      // Experience playbook nests under its project (`/project/$projectId/experience/
      // $id`). It fetches the playbook ROW (`/knowledge/playbook`) + its body
      // (`/knowledge/playbook/details`) and reads `/project` for the breadcrumb.
      // Like knowledge, it renders the Markdown body plus a right-hand "Detail"
      // panel (authoring DW + created time).
      await mockEndpoint(page, "knowledge/playbook", () => ({
        body: makeOkEnvelope({ playbook: makePlaybook(34, { projectId: 5 }) }),
      }));
      await mockEndpoint(page, "knowledge/playbook/details", () => ({
        body: makeOkEnvelope({
          content: "# Playbook body\n\nReusable steps here.",
          name: "Reusable Playbook",
        }),
      }));
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(makeProjectDetail(5)),
      }));

      await page.goto("/project/5/experience/34");

      // The Markdown body renders.
      await expect(
        page.getByRole("heading", { name: "Playbook body" }),
      ).toBeVisible();
      // The Detail panel renders with the authoring DW's name.
      const panel = page.getByRole("region", { name: "Detail" });
      await expect(panel).toBeVisible();
      await expect(panel.getByText("Generated by Max")).toBeVisible();
    },
  );

  test(
    "experience Back lands on the owning project when opened via deep-link",
    { tag: ["@key", "@project"] },
    async ({ page }) => {
      // Deep-link entry (goto = no in-app history), so Back can't go through history.
      // The projectId is in the route (`$projectId`), so Back navigates straight to
      // `/project/$projectId` — no playbook lookup, mirroring the knowledge detail.
      await mockEndpoint(page, "knowledge/playbook", () => ({
        body: makeOkEnvelope({ playbook: makePlaybook(34, { projectId: 5 }) }),
      }));
      await mockEndpoint(page, "knowledge/playbook/details", () => ({
        body: makeOkEnvelope({
          content: "# Playbook body\n\nReusable steps here.",
          name: "Reusable Playbook",
        }),
      }));
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(makeProjectDetail(5)),
      }));

      await page.goto("/project/5/experience/34");
      await expect(
        page.getByRole("heading", { name: "Playbook body" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Back" }).click();

      // The route's projectId (5) → the project workspace route, no async lookup.
      await expect(page).toHaveURL(/\/project\/5(?:$|[/?])/);
    },
  );

  test(
    "deliverable detail renders its file card and a Download action",
    { tag: ["@key", "@project"] },
    async ({ page }) => {
      // Deliverable detail reads `GET /project/deliverable?id` (the row) + the
      // owning project detail (for the back-nav breadcrumb label).
      await mockEndpoint(page, "project/deliverable", () => ({
        body: makeOkEnvelope({
          deliverable: makeDeliverable(9, { fileName: "Q3 Report.pdf" }),
        }),
      }));
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope({
          id: 1,
          name: "Acme",
          description: "",
          iconUrl: "",
          memberType: 1,
          agentInstances: [],
          ownerUsername: "o@b.test",
          creatorUsername: "c@b.test",
          operatorAdmins: [],
          createdAt: 1,
          updatedAt: 1,
        }),
      }));

      await page.goto("/project/1/deliverable/9");

      // The Detail panel renders with the deliverable's file name…
      const panel = page.getByRole("region", { name: "Detail" });
      await expect(panel).toBeVisible();
      await expect(panel.getByText("Q3 Report.pdf")).toBeVisible();
      // …and its "…" menu carries a Download action (the file has a sasUrl).
      await page.getByRole("button", { name: "Asset actions" }).click();
      await expect(
        page.getByRole("menuitem", { name: "Download" }),
      ).toBeVisible();
    },
  );

  test(
    "a non-ready knowledge asset redirects back to its project",
    { tag: ["@key", "@project"] },
    async ({ page }) => {
      // The readiness guard (asset-detail-content.tsx): a Knowledge row whose
      // status ≠ 3 (INGESTED) is not viewable, so the content effect redirects to
      // the owning project workspace instead of rendering the panel. Every other
      // test seeds INGESTED; this locks the URL contract for the not-ready branch.
      // status 1 = a still-ingesting document.
      await mockDetailSuccess(page, { name: "Half-ingested", status: 1 });

      await page.goto(ASSET_URL);
      // The guard bounces to /project/$projectId — no Detail panel is rendered.
      await expect(page).toHaveURL(/\/project\/1(?:$|[/?])/);
    },
  );

  test(
    "the experience detail 500s into the shared error view",
    { tag: ["@error", "@project"] },
    async ({ page }) => {
      // Only knowledge's 500 was covered; experience shares the same route-level
      // ErrorBoundary. A 500 on the playbook row must surface Try again.
      await mockEndpoint(page, "knowledge/playbook", () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto("/project/5/experience/34");
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        {
          timeout: 15_000,
        },
      );
    },
  );

  test(
    "the deliverable detail 500s into the shared error view",
    { tag: ["@error", "@project"] },
    async ({ page }) => {
      // The deliverable's third sibling route, same boundary. A 500 on the
      // deliverable row must surface Try again rather than a blank panel.
      await mockEndpoint(page, "project/deliverable", () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto("/project/1/deliverable/9");
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        {
          timeout: 15_000,
        },
      );
    },
  );

  test(
    "a viewer without manage rights sees Delete gated on the asset menu",
    { tag: ["@key", "@knowledge"] },
    async ({ page }) => {
      // The delete-success test grants project_admin; here the viewer holds NO
      // role, so the asset actions menu's Delete item is gated (greyed +
      // aria-disabled, not native disabled — hover shows the reason tooltip).
      await mockDetailSuccess(page, { name: "Quarterly Report" });
      await mockEndpoint(page, "rbac/user_roles", () => ({
        body: makeOkEnvelope({ roles: [], total: 0 }),
      }));

      await page.goto(ASSET_URL);
      await expect(page.getByRole("region", { name: "Detail" })).toBeVisible();
      await page.getByRole("button", { name: "Asset actions" }).click();
      await expect(
        page.getByRole("menuitem", { name: "Delete" }),
      ).toHaveAttribute("aria-disabled", "true");
    },
  );

  test(
    "a deliverable with no published file offers no Download action",
    { tag: ["@key", "@project"] },
    async ({ page }) => {
      // Download renders only when the deliverable carries a `fileSasUrl`. A
      // deliverable whose file is absent (null) exposes no Download item — the
      // menu still opens (Delete lives there) but Download is gone.
      await mockEndpoint(page, "project/deliverable", () => ({
        body: makeOkEnvelope({
          deliverable: makeDeliverable(9, {
            fileName: "Pending.pdf",
            fileSasUrl: null,
          }),
        }),
      }));
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(makeProjectDetail(1)),
      }));

      await page.goto("/project/1/deliverable/9");
      const panel = page.getByRole("region", { name: "Detail" });
      await expect(panel).toBeVisible();
      await page.getByRole("button", { name: "Asset actions" }).click();
      await expect(
        page.getByRole("menuitem", { name: "Download" }),
      ).toHaveCount(0);
    },
  );
});

// REAL environment (@real): a read-only asset detail on live data. No mocking —
// runs only when `SICO_E2E_URL` is set. Asset ids are not owner-stable, so
// instead of a locked id this drives real navigation: open /project/80, click
// the first navigable asset row, and assert an asset detail route + its Detail
// panel render. Fully read-only (no delete) and drift-proof (no locked literal).
// Skips if the fixture project carries no navigable assets.
test.describe("project asset detail @real", () => {
  test(
    "real: opening the first asset row renders its Detail panel",
    { tag: ["@key", "@project"] },
    async ({ page }) => {
      skipWithoutCreds("admin");
      await realLogin(page, "admin");

      await page.goto("/project/80", { waitUntil: "networkidle" });
      // Asset rows navigate via a name <button> inside a data row. Scope to data
      // rows (they contain `cell`s; the header row has `columnheader`s and its
      // own sort buttons) and take the first row's name button (the first
      // button in the row; the trailing one is the "Asset actions" menu).
      const firstDataRow = page
        .getByRole("row")
        .filter({ has: page.getByRole("cell") })
        .first();
      test.skip(
        (await firstDataRow.count()) === 0,
        "No navigable assets on the real fixture project",
      );
      const firstAssetName = firstDataRow.getByRole("button").first();

      await firstAssetName.click();
      // Lands on one of the three asset detail routes under the project.
      await expect(page).toHaveURL(
        /\/project\/80\/(?:knowledge|experience|deliverable)\/\d+/,
      );
      await expect(page.getByRole("region", { name: "Detail" })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );
});
