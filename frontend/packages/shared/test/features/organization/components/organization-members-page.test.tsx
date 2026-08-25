import { defineOrganizationPageContract } from "./organization-page-test-contract";

defineOrganizationPageContract({
  pageName: "OrganizationMembersPage",
  pageKind: "Members",
  loadPage: async () => {
    const { OrganizationMembersPage } =
      await import("@/features/organization/components/organization-members-page");
    return OrganizationMembersPage;
  },
});
