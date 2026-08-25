import { expect, type Page, test } from "@playwright/test";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

import {
  mockBoundOrganizationAccess,
  mockSicoApi,
  seedAuth,
} from "./fixtures/seed-auth";

// E2E for Studio creation: fill the dialog's required Name + Role, then
// Continue creates the agent (POST /agent/single_agent) and navigates to the
// edit route (/studio/$agentId/setup). Roles come from GET /agent/roles.

const NEW_AGENT_ID = "f2a41678-e4b7-4ad8-a6cf-84f6fd8cc601";
const LIST_AGENT_ID = "8dd7448e-e900-4486-bf28-b88726154e31";

// GET /agent/roles → { role: string[] } (rolesPayloadSchema maps to options).
async function mockRoles(page: Page): Promise<void> {
  await page.route("**/api/sico/agent/roles", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeOkEnvelope({ role: ["Researcher", "Writer"] })),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await seedAuth(page);
  await mockSicoApi(page);
  await mockBoundOrganizationAccess(page);
  await mockRoles(page);
});

// --- List page (`/studio/all`) ----------------------------------------------
// The Studio All tab renders the organization-scoped full-agent endpoint behind
// a Suspense + ErrorBoundary, with a "Create" action into /studio/setup. The
// setup/edit specs below never visit the list itself; these lock its three
// mock-producible states. NOTE: Studio has NO `@real` twin — a real create is a
// write with no clean teardown (agents can't be self-deleted here), so per the
// follow-up principle Studio stays mock-only.
async function mockStudioAgents(
  page: Page,
  agents: { agentId: string; name: string; role?: string }[],
): Promise<void> {
  await page.route("**/api/sico/agent/single_agents*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        makeOkEnvelope({
          agents: agents.map((agent) => ({
            ...agent,
            role: agent.role ?? "Researcher",
            desc: "",
            creatorUsername: "developer@sico.dev",
            organizationId: 9,
            publishStatus: 0,
          })),
          total: agents.length,
          hasNext: false,
        }),
      ),
    });
  });
}

async function mockPlatformAdminWithStudioAccess(page: Page): Promise<void> {
  await page.route("**/api/sico/rbac/user_roles*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        makeOkEnvelope({
          roles: [
            {
              userId: 1,
              roleCode: "developer",
              scopeType: "org",
              scopeId: 9,
            },
            {
              userId: 1,
              roleCode: "platform_admin",
              scopeType: "platform",
              scopeId: 0,
            },
          ],
          total: 2,
          hasNext: false,
        }),
      ),
    });
  });
}

test(
  "studio list: redirects to All and reuses the organization agent list across tabs",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    let listRequests = 0;
    await page.route("**/api/sico/agent/single_agents*", async (route) => {
      listRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeOkEnvelope({
            agents: [
              {
                agentId: LIST_AGENT_ID,
                name: "Ada",
                role: "Researcher",
                desc: "",
                creatorUsername: "developer@sico.dev",
                organizationId: 9,
                publishStatus: 0,
              },
            ],
            total: 1,
            hasNext: false,
          }),
        ),
      });
    });

    await page.goto("/studio");
    await expect(page).toHaveURL(/\/studio\/all$/);
    await expect(
      page.getByRole("link", { name: "Open Ada's setup" }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Created" }).click();
    await expect(page).toHaveURL(/\/studio\/created$/);
    await page.getByRole("tab", { name: "Editable" }).click();
    await expect(page).toHaveURL(/\/studio\/editable$/);

    expect(listRequests).toBe(1);
  },
);

test(
  "studio list: platform admin queries without an organization scope",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    await mockPlatformAdminWithStudioAccess(page);
    let listSearch = "";
    await page.route("**/api/sico/agent/single_agents*", async (route) => {
      listSearch = new URL(route.request().url()).search;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeOkEnvelope({ agents: [], total: 0, hasNext: false }),
        ),
      });
    });

    await page.goto("/studio");
    await expect(
      page.getByRole("heading", { level: 2, name: "No digital workers yet" }),
    ).toBeVisible();
    await expect.poll(() => listSearch).not.toBe("");

    const searchParams = new URLSearchParams(listSearch);
    expect(searchParams.has("organizationId")).toBe(false);
    expect(searchParams.get("publishStatusList")).toBe("0,1");
    expect(searchParams.get("intent")).toBe("0");
  },
);

test(
  "studio list: Continue creates a worker and navigates to detail setup",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    await mockStudioAgents(page, [
      { agentId: LIST_AGENT_ID, name: "Ada", role: "Researcher" },
    ]);
    await page.route("**/api/sico/agent/single_agent", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOkEnvelope({ agentId: NEW_AGENT_ID })),
      });
    });

    await page.goto("/studio");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(
      page.getByRole("dialog", { name: "Create new Digital Worker role" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/studio\/all$/);

    await page.getByLabel(/role name/i).fill("Atlas");
    await page.getByRole("combobox", { name: "Industry Type" }).click();
    await page.getByRole("option", { name: "Researcher" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(new RegExp(`/studio/${NEW_AGENT_ID}/setup`));
  },
);

test(
  "studio list: renders the empty state when there are no agents",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    await mockStudioAgents(page, []);

    await page.goto("/studio");
    await expect(
      page.getByRole("heading", { level: 2, name: "No digital workers yet" }),
    ).toBeVisible();
  },
);

test(
  "studio list: renders the error view with Try again on 500",
  { tag: ["@error", "@studio"] },
  async ({ page }) => {
    await page.route("**/api/sico/agent/single_agents*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: 500, msg: "server error", data: {} }),
      });
    });

    await page.goto("/studio");
    // The suspense query retries 3× with backoff before throwing to the
    // ErrorBoundary, so allow more than the default 5s assertion timeout.
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible({
      timeout: 15_000,
    });
  },
);

test(
  "studio: invalid creation reports required fields without writing",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    let createRequests = 0;
    await page.route("**/api/sico/agent/single_agent", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      createRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOkEnvelope({ agentId: NEW_AGENT_ID })),
      });
    });

    await page.goto("/studio/setup");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Role Name is required")).toBeVisible();
    await expect(page.getByText("Industry Type is required")).toBeVisible();
    expect(createRequests).toBe(0);
    await expect(page).toHaveURL(/\/studio\/setup$/);
  },
);

test(
  "studio: creating a digital worker saves and navigates to edit",
  {
    tag: ["@key", "@studio"],
  },
  async ({ page }) => {
    await page.route("**/api/sico/agent/single_agent", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOkEnvelope({ agentId: NEW_AGENT_ID })),
      });
    });

    await page.goto("/studio/setup");

    await page.getByLabel(/role name/i).fill("Ryan");
    // Role is a Base UI Select — open the trigger, pick an option.
    await page.getByRole("combobox", { name: "Industry Type" }).click();
    await page.getByRole("option", { name: "Researcher" }).click();

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Saved successfully!")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/studio/${NEW_AGENT_ID}/setup`));
  },
);

test(
  "studio: a failed create keeps the form and toasts",
  {
    tag: ["@error", "@studio"],
  },
  async ({ page }) => {
    await page.route("**/api/sico/agent/single_agent", async (route) => {
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

    await page.goto("/studio/setup");
    await page.getByLabel(/role name/i).fill("Ryan");
    await page.getByRole("combobox", { name: "Industry Type" }).click();
    await page.getByRole("option", { name: "Researcher" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByText("Some changes could not be saved."),
    ).toBeVisible();
    // Stayed on the create route; the typed name survives for a retry.
    await expect(page).toHaveURL(/\/studio\/setup/);
    await expect(page.getByLabel(/role name/i)).toHaveValue("Ryan");
  },
);

// --- Edit-mode setup (`/studio/$agentId/setup`) ------------------------------
// Loads an existing agent (GET /agent/single_agent), its skills (GET /skills/
// list), and roles. Save persists Basic Info edits (PUT /agent/single_agent).

const EDIT_AGENT_ID = "9f3a21e0-8b3d-4b94-94ab-217a804a3001";
const EDIT_URL = `/studio/${EDIT_AGENT_ID}/setup`;
const OWNER_AGENT_ID = "a3c0bc10-6d1c-4b33-a866-f3e1b2b91cde";
const OWNER_EDIT_URL = `/studio/${OWNER_AGENT_ID}/setup`;

// The edit body suspends on the agent detail + skills list; seed both.
async function mockAgentDraft(
  page: Page,
  withEmptySkills = true,
): Promise<void> {
  await page.route(/\/api\/sico\/agent\/single_agent\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        makeOkEnvelope({
          // Payload nests the draft under `agent` (singleAgentPayloadSchema).
          agent: {
            agentId: EDIT_AGENT_ID,
            name: "Max",
            role: "Researcher",
            creatorUsername: "a@b.test",
          },
        }),
      ),
    });
  });
  if (withEmptySkills) {
    await mockEmptySkills(page);
  }
}

async function mockEmptySkills(page: Page): Promise<void> {
  await page.route("**/api/sico/skills/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        makeOkEnvelope({ skills: [], total: 0, hasNext: false }),
      ),
    });
  });
}

async function mockOwnerAgentDraft(
  page: Page,
  owner = "a@b.test",
): Promise<void> {
  await page.route(/\/api\/sico\/agent\/single_agent\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        makeOkEnvelope({
          agent: {
            agentId: OWNER_AGENT_ID,
            name: "Max",
            role: "Researcher",
            creatorUsername: owner,
          },
        }),
      ),
    });
  });
  await mockEmptySkills(page);
}

test(
  "studio edit: Basic Info autosaves without a Save button",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    await mockAgentDraft(page);
    let updateRequests = 0;
    await page.route("**/api/sico/agent/single_agent", async (route) => {
      if (route.request().method() !== "PUT") {
        await route.fallback();
        return;
      }
      updateRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOkEnvelope({})),
      });
    });

    await page.goto(EDIT_URL);
    const name = page.getByLabel(/role name/i);
    await expect(name).toHaveValue("Max");
    await name.fill("Max Renamed");

    await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
    await expect.poll(() => updateRequests).toBe(1);
    await expect(page.getByText("Saved")).toBeVisible();
  },
);

test(
  "studio edit: Upload immediately creates and parses a skill",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    await mockAgentDraft(page, false);
    const requestOrder: string[] = [];
    let skillCreated = false;
    const skill = {
      id: 9,
      agentId: EDIT_AGENT_ID,
      name: "Search",
      description: "",
      version: "v1",
      status: 1,
      assetId: 41,
      creatorUsername: "a@b.test",
      failReason: "",
      projectId: 1,
      createdAt: 1,
      updatedAt: "2",
    };
    await page.route("**/api/sico/skills/list*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeOkEnvelope({
            skills: skillCreated ? [skill] : [],
            total: skillCreated ? 1 : 0,
            hasNext: false,
          }),
        ),
      });
    });
    await page.route("**/api/sico/project/asset", async (route) => {
      requestOrder.push("asset");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOkEnvelope({ id: 41 })),
      });
    });
    await page.route("**/api/sico/skills", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      requestOrder.push("skill");
      skillCreated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOkEnvelope({ skill })),
      });
    });
    await page.route("**/api/sico/skills/status*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOkEnvelope({ status: 1 })),
      });
    });

    await page.goto(EDIT_URL);
    await page.getByRole("button", { name: "Add skills" }).click();
    await page.getByLabel("Skill files").setInputFiles({
      name: "search.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# Search"),
    });
    await page.getByRole("button", { name: "Upload" }).click();

    await expect.poll(() => requestOrder).toEqual(["asset", "skill"]);
    await expect(
      page.getByRole("dialog", { name: "Add skills" }),
    ).not.toBeVisible();
    await expect(page.getByText("Parsing skill content")).toBeVisible();
  },
);

test(
  "studio: a bound organization request failure shows the retry boundary",
  { tag: ["@error", "@studio"] },
  async ({ page }) => {
    await mockBoundOrganizationAccess(page, { organizationStatus: 500 });
    await page.goto("/studio");

    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible({
      timeout: 15_000,
    });
  },
);

test(
  "studio: a qualifying grant outside the bound organization is denied",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    await mockBoundOrganizationAccess(page, {
      organizationIds: [9, 10],
      grants: [{ roleCode: "developer", scopeId: 10 }],
    });
    await page.goto("/studio");

    await expect(page).toHaveURL(/\/studio/);
    await expect(page.getByTestId("studio-access-denied")).toBeVisible();
  },
);

test(
  "studio edit: an owner can invite an editor",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    let assigned = false;
    await mockOwnerAgentDraft(page);
    await page.route("**/api/sico/rbac/role_users*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeOkEnvelope({ users: [], total: 0, hasNext: false }),
        ),
      });
    });
    await page.route("**/api/sico/rbac/users*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeOkEnvelope({
            users: [{ id: 2, email: "editor@example.com" }],
            total: 1,
            hasNext: false,
          }),
        ),
      });
    });
    await page.route("**/api/sico/rbac/user_role", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      assigned = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOkEnvelope({})),
      });
    });

    await page.goto(OWNER_EDIT_URL);
    await page.getByRole("button", { name: "More setup actions" }).click();
    await page.getByRole("menuitem", { name: "Manage editors" }).click();
    await expect(
      page.getByRole("heading", { name: "Invite editor" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Email address" })
      .fill("editor@example.com");
    await page.getByRole("button", { name: "Invite" }).click();

    await expect.poll(() => assigned).toBe(true);
  },
);

test(
  "studio edit: an owner can delete a digital worker",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    let deleted = false;
    await mockOwnerAgentDraft(page);
    await mockStudioAgents(page, []);
    await page.route("**/api/sico/agent/single_agent*", async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback();
        return;
      }
      deleted = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeOkEnvelope({})),
      });
    });

    await page.goto(OWNER_EDIT_URL);
    await page.getByRole("button", { name: "More setup actions" }).click();
    await page.getByRole("menuitem", { name: "Delete digital worker" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect.poll(() => deleted).toBe(true);
    await expect(page).toHaveURL(/\/studio\/all$/);
  },
);

test(
  "studio edit: an editor cannot manage or delete",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    await mockOwnerAgentDraft(page, "owner@example.com");
    await page.route("**/api/sico/rbac/user_roles*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          makeOkEnvelope({
            roles: [
              {
                userId: 1,
                roleCode: "developer",
                scopeType: "org",
                scopeId: 9,
              },
              {
                userId: 1,
                roleCode: "agent_editor",
                scopeType: "agent",
                scopeId: OWNER_AGENT_ID,
              },
            ],
            total: 2,
            hasNext: false,
          }),
        ),
      });
    });

    await page.goto(OWNER_EDIT_URL);
    await page.getByRole("button", { name: "More setup actions" }).click();

    await expect(
      page.getByRole("menuitem", { name: "Manage editors" }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      page.getByRole("menuitem", { name: "Delete digital worker" }),
    ).toHaveAttribute("aria-disabled", "true");
  },
);

test(
  "studio edit: publishing repeats with the selected access",
  { tag: ["@key", "@studio"] },
  async ({ page }) => {
    const publishStatuses: number[] = [];
    await mockOwnerAgentDraft(page);
    await page.route(
      "**/api/sico/agent/single_agent/publish",
      async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        const body = route.request().postDataJSON();
        if (
          typeof body === "object" &&
          body !== null &&
          "publishStatus" in body &&
          typeof body.publishStatus === "number"
        ) {
          publishStatuses.push(body.publishStatus);
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeOkEnvelope({})),
        });
      },
    );

    await page.goto(OWNER_EDIT_URL);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(
      page.getByRole("heading", { name: "Publish digital worker" }),
    ).toBeVisible();
    await page.getByLabel("Access").click();
    await page.getByRole("option", { name: "My organization" }).click();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect.poll(() => publishStatuses).toEqual([1]);
    await expect(
      page.getByRole("heading", { name: "Publish digital worker" }),
    ).not.toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(
      page.getByRole("heading", { name: "Publish digital worker" }),
    ).toBeVisible();
    await page.getByLabel("Access").click();
    await page.getByRole("option", { name: "Only me" }).click();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect.poll(() => publishStatuses).toEqual([1, 0]);
  },
);

test(
  "studio edit: a failed delete keeps confirmation open",
  { tag: ["@error", "@studio"] },
  async ({ page }) => {
    await mockOwnerAgentDraft(page);
    await page.route("**/api/sico/agent/single_agent*", async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: 500, msg: "delete error", data: {} }),
      });
    });

    await page.goto(OWNER_EDIT_URL);
    await page.getByRole("button", { name: "More setup actions" }).click();
    await page.getByRole("menuitem", { name: "Delete digital worker" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(
      page.getByRole("dialog", { name: "Delete digital worker" }),
    ).toBeVisible();
    await expect(page).toHaveURL(OWNER_EDIT_URL);
  },
);
