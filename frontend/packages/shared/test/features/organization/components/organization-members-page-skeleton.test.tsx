import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrganizationMembersPageSkeleton } from "@/features/organization/components/organization-members-page-skeleton";

describe("OrganizationMembersPageSkeleton", () => {
  it("announces that members are loading", () => {
    render(<OrganizationMembersPageSkeleton />);

    expect(
      screen.getByRole("status", { name: "Loading members" }),
    ).toBeVisible();
  });

  it("renders a two-item action strip and four-column rows", () => {
    render(<OrganizationMembersPageSkeleton />);

    expect(
      within(
        screen.getByTestId("organization-members-action-strip"),
      ).getAllByTestId("organization-members-action-placeholder"),
    ).toHaveLength(2);
    expect(
      screen.getByTestId("organization-table-rows-skeleton"),
    ).toHaveAttribute("data-columns", "4");
  });
});
