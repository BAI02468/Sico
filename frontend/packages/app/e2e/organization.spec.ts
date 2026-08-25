import { expect, test } from "@playwright/test";

import {
  mockOrganizationDetail,
  mockOrganizationRoleUsers,
} from "./fixtures/organization";
import {
  mockBoundOrganizationAccess,
  mockSicoApi,
  seedAuth,
} from "./fixtures/seed-auth";

test.beforeEach(async ({ page }) => {
  await seedAuth(page);
  await mockSicoApi(page);
});

test(
  "a bound organization member enters management read-only",
  { tag: ["@key", "@organization"] },
  async ({ page }) => {
    await mockBoundOrganizationAccess(page, {
      organizationIds: [9, 10],
      grants: [{ roleCode: "org_member", scopeId: 9 }],
    });
    await mockOrganizationDetail(page, {
      id: 9,
      name: "SICO 1",
      description: "",
      createdAt: 1,
      updatedAt: 1,
    });
    await mockOrganizationRoleUsers(page, {
      usersByRole: {
        org_member: [{ id: 2, email: "member@example.com", alias: "Member" }],
      },
    });

    await page.goto("/organization/members");

    await expect(
      page.getByRole("heading", { level: 1, name: "SICO 1" }),
    ).toBeVisible();
    await expect(page.getByText("Member", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Rename organization" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Change role" })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Member actions" }).click();
    await expect(
      page.getByRole("menuitem", { name: "Delete" }),
    ).toHaveAttribute("aria-disabled", "true");
  },
);
