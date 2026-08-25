import { expect, type Page } from "@playwright/test";
import { type OrganizationDetail } from "@sico/shared/features/organization/index.ts";
import {
  type OrganizationRoleCode,
  OrganizationRoleCodeSchema,
  type RbacUser,
} from "@sico/shared/features/rbac/index.ts";
import { makeOkEnvelope } from "@sico/shared/schemas/api.ts";

export async function mockOrganizationDetail(
  page: Page,
  organization: OrganizationDetail,
): Promise<void> {
  await page.route(/\/api\/sico\/organization\?/, async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("id")).toBe(String(organization.id));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeOkEnvelope({ organization })),
    });
  });
}

type MockOrganizationRoleUsersOptions = {
  usersByRole: Partial<Record<OrganizationRoleCode, RbacUser[]>>;
  expectedScopeId?: number;
};

export async function mockOrganizationRoleUsers(
  page: Page,
  { usersByRole, expectedScopeId }: MockOrganizationRoleUsersOptions,
): Promise<void> {
  await page.route("**/api/sico/rbac/role_users*", async (route) => {
    const url = new URL(route.request().url());
    if (expectedScopeId !== undefined) {
      expect(url.searchParams.get("scopeId")).toBe(String(expectedScopeId));
    }
    const roleCode = OrganizationRoleCodeSchema.parse(
      url.searchParams.get("roleCode"),
    );
    const users = usersByRole[roleCode] ?? [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        makeOkEnvelope({ users, total: users.length, hasNext: false }),
      ),
    });
  });
}
