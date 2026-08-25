import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AssetDetailSkeleton } from "@/features/projects/components/asset-detail-skeleton";

describe("<AssetDetailSkeleton>", () => {
  it("exposes one content-shaped loading status", () => {
    render(<AssetDetailSkeleton />);

    expect(
      screen.getByRole("status", { name: "Loading asset" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("mirrors the title actions and right-aligned collapse control", () => {
    render(<AssetDetailSkeleton />);

    const header = screen.getByTestId("asset-detail-skeleton-header");
    const titleActions = screen.getByTestId(
      "asset-detail-skeleton-title-actions",
    );

    expect(header).toHaveClass("justify-between", "pr-5", "pl-5");
    expect(titleActions).toContainElement(
      screen.getByTestId("asset-detail-skeleton-title"),
    );
    expect(titleActions).toContainElement(
      screen.getByTestId("asset-detail-skeleton-actions"),
    );
    expect(titleActions).not.toContainElement(
      screen.getByTestId("asset-detail-skeleton-collapse"),
    );
  });

  it("matches the panel body padding and local scrolling", () => {
    render(<AssetDetailSkeleton />);

    expect(screen.getByTestId("asset-detail-skeleton-body")).toHaveClass(
      "scrollbar",
      "overflow-y-auto",
      "pt-8",
      "pr-5",
      "pb-5",
      "pl-5",
    );
  });

  it("traces the simple metadata grouping", () => {
    render(<AssetDetailSkeleton variant="simple" />);

    expect(screen.getByTestId("asset-detail-skeleton-simple")).toHaveClass(
      "gap-6",
    );
    const fields = screen.getAllByTestId("asset-detail-skeleton-field");
    expect(fields).toHaveLength(2);
    for (const field of fields) {
      expect(field).toHaveClass("gap-3");
    }
    expect(
      screen.queryByTestId("asset-detail-skeleton-divider"),
    ).not.toBeInTheDocument();
  });

  it("separates each rich metadata group", () => {
    render(<AssetDetailSkeleton variant="rich" />);

    expect(screen.getAllByTestId("asset-detail-skeleton-divider")).toHaveLength(
      3,
    );
  });
});
