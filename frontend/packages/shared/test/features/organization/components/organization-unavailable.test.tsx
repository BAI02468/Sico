import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EMPTY_ILLUSTRATIONS } from "@/constants/empty-illustration";
import { OrganizationUnavailable } from "@/features/organization/components/organization-unavailable";

describe("<OrganizationUnavailable>", () => {
  it("renders the people illustration as a bodyless filled message state", () => {
    render(<OrganizationUnavailable />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "No organization available",
      }),
    ).toBeVisible();
    expect(screen.getByTestId("message-state-illustration")).toHaveAttribute(
      "src",
      EMPTY_ILLUSTRATIONS.people.url,
    );
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("message-state-illustration").parentElement
        ?.parentElement,
    ).toHaveClass(
      "flex",
      "h-full",
      "min-h-0",
      "flex-1",
      "items-center",
      "justify-center",
    );
  });
});
