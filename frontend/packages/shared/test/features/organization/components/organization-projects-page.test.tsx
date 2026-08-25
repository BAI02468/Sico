import { defineOrganizationPageContract } from "./organization-page-test-contract";

defineOrganizationPageContract({
  pageName: "OrganizationProjectsPage",
  pageKind: "Projects",
  loadPage: async () => {
    const { OrganizationProjectsPage } =
      await import("@/features/organization/components/organization-projects-page");
    return OrganizationProjectsPage;
  },
});
