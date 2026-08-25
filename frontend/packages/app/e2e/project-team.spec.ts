import { expect, type Page, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

import { makeProjectDetail, mockEndpoint } from "./fixtures/project-fixtures";
import { realLogin, skipWithoutCreds } from "./fixtures/real-auth";
import { mockSicoApi, seedAuth } from "./fixtures/seed-auth";

// E2E for the Operators (people) team tab (`/project/$id/team/operators`). The
// member list is a merge of two `GET /rbac/role_users` calls (project_admin +
// project_member). Permission (`useProjectPermission` → GET /rbac/user_roles)
// gates the Invite menu and per-row Remove; the owner row (email ===
// project.ownerUsername) is immutable. Remove → confirm → DELETE /rbac/user_role
// → "Member removed." toast.

const TEAM_URL = "/project/1/team/operators";

// The seeded viewer (seedAuth) is user 1 / a@b.test. Make them project_admin so
// the Remove action renders, and add a second, removable member.
const ADMIN = { id: 1, email: "a@b.test" };
const MEMBER = { id: 2, email: "member@b.test" };

async function mockTeam(page: Page): Promise<void> {
  // Project detail supplies ownerUsername; owner is a THIRD identity so neither
  // seeded row is the immutable owner.
  await mockEndpoint(page, "project", () => ({
    body: makeOkEnvelope(
      makeProjectDetail(1, { name: "Acme", ownerUsername: "owner@b.test" }),
    ),
  }));
  // Permission: the viewer (user 1) is a project_admin.
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
  // Member list: `role_users` is called per role. Admin role → the viewer;
  // member role → the removable member. Branch on the roleCode query param.
  await mockEndpoint(page, "rbac/role_users", (url) => {
    const admin = url.searchParams.get("roleCode") === "project_admin";
    return {
      body: makeOkEnvelope({
        users: admin ? [ADMIN] : [MEMBER],
        total: 1,
      }),
    };
  });
}

test.describe("project team", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockSicoApi(page);
  });

  test(
    "operators tab renders the merged member roster",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      await mockTeam(page);

      await page.goto(TEAM_URL);
      await expect(page.getByText("a@b.test")).toBeVisible();
      await expect(page.getByText("member@b.test")).toBeVisible();
    },
  );

  test(
    "removing a member confirms and toasts",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      await mockTeam(page);
      // DELETE /rbac/user_role removes the grant; ok envelope, no data.
      await mockEndpoint(page, "rbac/user_role", () => ({
        body: makeOkEnvelope({}),
      }));

      await page.goto(TEAM_URL);
      const memberRow = page.getByRole("row", { name: /member@b\.test/ });
      await expect(memberRow).toBeVisible();

      await memberRow.getByRole("button", { name: "Member actions" }).click();
      await page.getByRole("menuitem", { name: "Remove" }).click();

      const confirm = page.getByRole("dialog", { name: "Remove member" });
      await expect(confirm).toBeVisible();
      await confirm
        .getByRole("button", { name: "Remove", exact: true })
        .click();

      await expect(page.getByText("Member removed.")).toBeVisible();
    },
  );

  test(
    "inviting a registered user by email toasts success",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      await mockTeam(page);
      // findUserByEmail → GET /rbac/users?email resolves the invitee…
      await mockEndpoint(page, "rbac/users", () => ({
        body: makeOkEnvelope({
          users: [{ id: 3, email: "invitee@b.test" }],
          total: 1,
        }),
      }));
      // …then assignUserRole → POST /rbac/user_role grants the role.
      await mockEndpoint(page, "rbac/user_role", () => ({
        body: makeOkEnvelope({}),
      }));

      await page.goto(TEAM_URL);
      await page.getByRole("button", { name: "Invite" }).click();
      await page.getByRole("menuitem", { name: "Human Operator" }).click();

      const dialog = page.getByRole("dialog", { name: /Invite to/ });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Email").fill("invitee@b.test");
      await dialog.getByRole("button", { name: "Invite" }).click();

      await expect(page.getByText("Member invited.")).toBeVisible();
    },
  );

  test(
    "inviting an unregistered email aborts with a toast",
    { tag: ["@error", "@team"] },
    async ({ page }) => {
      await mockTeam(page);
      // GET /rbac/users returns no match → the dialog toasts and does not grant.
      await mockEndpoint(page, "rbac/users", () => ({
        body: makeOkEnvelope({ users: [], total: 0 }),
      }));

      await page.goto(TEAM_URL);
      await page.getByRole("button", { name: "Invite" }).click();
      await page.getByRole("menuitem", { name: "Human Operator" }).click();

      const dialog = page.getByRole("dialog", { name: /Invite to/ });
      await dialog.getByLabel("Email").fill("ghost@b.test");
      await dialog.getByRole("button", { name: "Invite" }).click();

      await expect(
        page.getByText("This user isn't registered yet."),
      ).toBeVisible();
    },
  );

  test(
    "changing a member's role toasts success",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      await mockTeam(page);
      // Role change → POST /rbac/user_role (assign) → "Role updated." toast.
      await mockEndpoint(page, "rbac/user_role", () => ({
        body: makeOkEnvelope({}),
      }));

      await page.goto(TEAM_URL);
      const memberRow = page.getByRole("row", { name: /member@b\.test/ });
      await expect(memberRow).toBeVisible();

      // The member's role cell is an admin-editable "Change role" trigger.
      await memberRow.getByRole("button", { name: "Change role" }).click();
      await page.getByRole("menuitemradio", { name: "Admin" }).click();

      await expect(page.getByText("Role updated.")).toBeVisible();
    },
  );

  // --- Digital Workers tab (`/project/$id/team/digital-workers`) ---------------
  // Sibling of the operators tab. Pages the project-scoped agents list
  // (GET /agent/single_agent_instances?projectId); the per-row "···" menu carries
  // Reassign + Dismiss (gated by dw.manage). Dismiss → confirm → POST
  // /agent/single_agent_instance/dismiss → "Digital Worker dismissed." toast.

  const DW_TEAM_URL = "/project/1/team/digital-workers";

  // A minimal agent instance row (agentSchema: id + name required; the rest
  // tolerate omission).
  const DW_ROW = { id: 7, name: "Max", role: "Researcher", status: 3 };

  async function mockDwRoster(page: Page): Promise<void> {
    await mockEndpoint(page, "agent/single_agent_instances", () => ({
      body: makeOkEnvelope({ instances: [DW_ROW], total: 1, hasNext: false }),
    }));
  }

  test(
    "digital-workers tab renders the project's agent roster",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      await mockTeam(page);
      await mockDwRoster(page);

      await page.goto(DW_TEAM_URL);
      // Scope to the roster table row: the sidebar's DW preview list also renders
      // "Max" once agents are mocked, so a bare getByText is a strict-mode conflict.
      await expect(page.getByRole("row", { name: /Max/ })).toBeVisible();
    },
  );

  test(
    "dismissing a digital worker confirms and toasts",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      await mockTeam(page);
      await mockDwRoster(page);
      await mockEndpoint(page, "agent/single_agent_instance/dismiss", () => ({
        body: makeOkEnvelope({}),
      }));

      await page.goto(DW_TEAM_URL);
      const row = page.getByRole("row", { name: /Max/ });
      await expect(row).toBeVisible();

      await row.getByRole("button", { name: "Digital Worker actions" }).click();
      await page.getByRole("menuitem", { name: "Dismiss" }).click();

      const confirm = page.getByRole("dialog", {
        name: "Dismiss digital worker",
      });
      await expect(confirm).toBeVisible();
      await confirm
        .getByRole("button", { name: "Dismiss", exact: true })
        .click();

      await expect(page.getByText("Digital Worker dismissed.")).toBeVisible();
    },
  );

  test(
    "reassigning a digital worker to a member toasts success",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      // The DW row's "···" menu carries Reassign (gated on dw.manage). It opens a
      // dialog whose operator Select reads the project members (the two role_users
      // calls) and, on confirm, POSTs /agent/single_agent_instance/reassign. This
      // is the DW tab's second primary write (Dismiss is the sibling above).
      await mockTeam(page);
      await mockDwRoster(page);
      await mockEndpoint(page, "agent/single_agent_instance/reassign", () => ({
        body: makeOkEnvelope({}),
      }));

      await page.goto(DW_TEAM_URL);
      const row = page.getByRole("row", { name: /Max/ });
      await expect(row).toBeVisible();

      await row.getByRole("button", { name: "Digital Worker actions" }).click();
      await page.getByRole("menuitem", { name: "Reassign" }).click();

      const dialog = page.getByRole("dialog", {
        name: "Reassign Digital Worker",
      });
      await expect(dialog).toBeVisible();
      // The operator Select is seeded from the mocked member roster.
      await dialog.getByRole("combobox", { name: "New operator" }).click();
      await page.getByRole("option", { name: "member@b.test" }).click();
      await dialog
        .getByRole("button", { name: "Reassign", exact: true })
        .click();

      await expect(page.getByText("Digital Worker reassigned.")).toBeVisible();
    },
  );

  test(
    "operators tab surfaces the error view when the roster fails",
    { tag: ["@error", "@team"] },
    async ({ page }) => {
      // The members page wraps the roster in a Suspense + ErrorBoundary. A 500 on
      // the role_users list must surface ErrorView + Try again — not a blank tab
      // or a crash past the boundary. The project detail still resolves so only the
      // roster query is the failing branch.
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(makeProjectDetail(1)),
      }));
      await mockEndpoint(page, "rbac/user_roles", () => ({
        body: makeOkEnvelope({ roles: [], total: 0 }),
      }));
      await mockEndpoint(page, "rbac/role_users", () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto(TEAM_URL);
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        {
          timeout: 15_000,
        },
      );
    },
  );

  test(
    "bare /project/$id/team redirects to the operators tab",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      // `team.index` beforeLoad throws a redirect to /team/operators (Team has no
      // combined view). Locks that URL contract from a bare /team deep-link.
      await mockTeam(page);

      await page.goto("/project/1/team");
      await expect(page).toHaveURL(/\/project\/1\/team\/operators(?:\?|$)/);
      await expect(page.getByRole("table").getByText("a@b.test")).toBeVisible();
    },
  );

  test(
    "switching to the Digital Workers tab swaps the roster and URL",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      // The tabs are <Link>s to sibling routes. Clicking "Digital Workers" from
      // the operators tab must navigate to the DW route and render its roster.
      await mockTeam(page);
      await mockDwRoster(page);

      await page.goto(TEAM_URL);
      await expect(page.getByText("member@b.test")).toBeVisible();

      await page.getByRole("tab", { name: "Digital Workers" }).click();
      await expect(page).toHaveURL(/\/team\/digital-workers(?:\?|$)/);
      await expect(page.getByRole("row", { name: /Max/ })).toBeVisible();
    },
  );

  test(
    "operators tab shows the empty state when the roster is empty",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      // Both role_users calls return no users → MembersEmpty (variant humans).
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(makeProjectDetail(1)),
      }));
      await mockEndpoint(page, "rbac/user_roles", () => ({
        body: makeOkEnvelope({ roles: [], total: 0 }),
      }));
      await mockEndpoint(page, "rbac/role_users", () => ({
        body: makeOkEnvelope({ users: [], total: 0 }),
      }));

      await page.goto(TEAM_URL);
      await expect(
        page.getByRole("heading", { name: "No members yet" }),
      ).toBeVisible();
    },
  );

  test(
    "a non-admin viewer sees no Invite menu and no per-row actions",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      // Permission gates the writes: with NO project role, the header Invite menu
      // is hidden and each member row shows plain role text (no "Member actions",
      // no "Change role"). This is RBAC's core read contract — the negative of
      // every other team test, which grants project_admin.
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(
          makeProjectDetail(1, { ownerUsername: "owner@b.test" }),
        ),
      }));
      // Viewer holds no role.
      await mockEndpoint(page, "rbac/user_roles", () => ({
        body: makeOkEnvelope({ roles: [], total: 0 }),
      }));
      await mockEndpoint(page, "rbac/role_users", (url) => {
        const admin = url.searchParams.get("roleCode") === "project_admin";
        return {
          body: makeOkEnvelope({
            users: admin ? [ADMIN] : [MEMBER],
            total: 1,
          }),
        };
      });

      await page.goto(TEAM_URL);
      await expect(page.getByText("member@b.test")).toBeVisible();
      // No write affordances render for a permission-less viewer: the header
      // Invite menu is gone and the role cell is plain text (no "Change role").
      await expect(page.getByRole("button", { name: "Invite" })).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Change role" }),
      ).toHaveCount(0);
      // The "···" trigger still renders, but its Remove item is gated (greyed +
      // aria-disabled, not natively disabled — the tooltip needs hover). Opening
      // it proves Remove is unavailable to a permission-less viewer.
      const memberRow = page.getByRole("row", { name: /member@b\.test/ });
      await memberRow.getByRole("button", { name: "Member actions" }).click();
      await expect(
        page.getByRole("menuitem", { name: "Remove" }),
      ).toHaveAttribute("aria-disabled", "true");
    },
  );

  test(
    "the owner row is immutable even for an admin viewer",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      // The project owner's row is read-only for everyone: no "Change role", no
      // "Member actions" — even when the viewer is a project_admin. Seed the
      // owner as one of the listed members so its row renders.
      const OWNER = { id: 9, email: "owner@b.test" };
      await mockEndpoint(page, "project", () => ({
        body: makeOkEnvelope(
          makeProjectDetail(1, { ownerUsername: "owner@b.test" }),
        ),
      }));
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
      // Admin role lists the owner; member role lists a removable member.
      await mockEndpoint(page, "rbac/role_users", (url) => {
        const admin = url.searchParams.get("roleCode") === "project_admin";
        return {
          body: makeOkEnvelope({
            users: admin ? [OWNER] : [MEMBER],
            total: 1,
          }),
        };
      });

      await page.goto(TEAM_URL);
      const ownerRow = page.getByRole("row", { name: /owner@b\.test/ });
      await expect(ownerRow).toBeVisible();
      // The owner row carries no actions menu…
      await expect(
        ownerRow.getByRole("button", { name: "Member actions" }),
      ).toHaveCount(0);
      // …while the regular member row still does (proving gating is row-level).
      const memberRow = page.getByRole("row", { name: /member@b\.test/ });
      await expect(
        memberRow.getByRole("button", { name: "Member actions" }),
      ).toBeVisible();
    },
  );

  test(
    "digital-workers tab surfaces the error view when its roster fails",
    { tag: ["@error", "@team"] },
    async ({ page }) => {
      // Sibling of the operators-500 test: a 500 on the project-scoped agents
      // list must surface the DW tab's ErrorView + Try again.
      await mockTeam(page);
      await mockEndpoint(page, "agent/single_agent_instances", () => ({
        status: 500,
        body: { code: 500, msg: "server error", data: {} },
      }));

      await page.goto(DW_TEAM_URL);
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        {
          timeout: 15_000,
        },
      );
    },
  );
});

// REAL environment (@real): the read-only operators roster on live data. No
// mocking — runs only when `SICO_E2E_URL` is set. `/project/80` is the
// owner-guaranteed fixture project (same one project-workspace's real twin
// uses); the roster is read-only here (invite/remove/reassign are writes, left
// mock-only). Structural: the operators tab mounts and does not crash.
test.describe("project team @real", () => {
  const READONLY_TEAM_URL = "/project/80/team/operators";

  test(
    "real /project/80 operators roster renders without crashing",
    { tag: ["@key", "@team"] },
    async ({ page }) => {
      skipWithoutCreds("admin");
      await realLogin(page, "admin");

      await page.goto(READONLY_TEAM_URL, { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/project\/80\/team\/operators(?:\?|$)/);
      // The roster is a table; at least the admin viewer's own row exists, so a
      // table lands. Assert structurally (a table) — never a live email literal.
      await expect(page.getByRole("table").first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
  );
});
