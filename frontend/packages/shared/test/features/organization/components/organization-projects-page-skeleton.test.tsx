import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrganizationProjectsPageSkeleton } from "@/features/organization/components/organization-projects-page-skeleton";

describe("OrganizationProjectsPageSkeleton", () => {
  it("announces that projects are loading", () => {
    render(<OrganizationProjectsPageSkeleton />);

    expect(
      screen.getByRole("status", { name: "Loading projects" }),
    ).toBeVisible();
  });

  it("renders three stat cards and five-column rows", () => {
    render(<OrganizationProjectsPageSkeleton />);

    expect(
      screen.getAllByTestId("organization-project-stat-skeleton"),
    ).toHaveLength(3);
    expect(
      screen.getByTestId("organization-table-rows-skeleton"),
    ).toHaveAttribute("data-columns", "5");
  });
});
