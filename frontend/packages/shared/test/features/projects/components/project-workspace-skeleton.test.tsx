import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectWorkspaceSkeleton } from "@/features/projects/components/project-workspace-skeleton";

describe("<ProjectWorkspaceSkeleton>", () => {
  it("exposes a single content-shaped loading status for the workspace", () => {
    render(<ProjectWorkspaceSkeleton />);

    expect(
      screen.getByRole("status", { name: /loading project/i }),
    ).toBeInTheDocument();
    // The right panel composes ProjectDrawerSkeleton — it must NOT add its own
    // nested status region (the workspace owns the single one), mirroring the
    // ProjectsGridSkeleton → aria-hidden ProjectCardSkeleton building block.
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("mirrors the drawer on the right by composing ProjectDrawerSkeleton", () => {
    render(<ProjectWorkspaceSkeleton />);

    // The crude 4-bar panel is replaced by the real drawer-shaped skeleton, so
    // the right column does not reflow into the rich ProjectDrawer when the
    // project-detail + knowledge tags queries resolve.
    expect(screen.getByTestId("project-drawer-skeleton")).toBeInTheDocument();
  });

  it("mirrors the drawer title and right-aligned collapse control", () => {
    render(<ProjectWorkspaceSkeleton />);

    const header = screen.getByTestId("project-drawer-skeleton-header");
    const title = screen.getByTestId("project-drawer-skeleton-title");
    const action = screen.getByTestId("project-drawer-skeleton-action");
    const collapse = screen.getByTestId("project-drawer-skeleton-collapse");

    expect(header).toHaveClass("justify-between", "pr-5", "pl-5");
    expect(header.firstElementChild).toBe(title);
    expect(title).toContainElement(action);
    expect(title).not.toContainElement(collapse);
    expect(header.lastElementChild).toBe(collapse);
  });

  it("matches the drawer body padding and local scrolling", () => {
    render(<ProjectWorkspaceSkeleton />);

    expect(screen.getByTestId("project-drawer-skeleton-body")).toHaveClass(
      "scrollbar",
      "overflow-y-auto",
      "pt-8",
      "pr-5",
      "pb-5",
      "pl-5",
    );
  });

  it("traces the project avatar actions row and metadata copy", () => {
    render(<ProjectWorkspaceSkeleton />);

    expect(screen.getByTestId("project-drawer-skeleton-meta-row")).toHaveClass(
      "items-start",
      "justify-between",
      "gap-1",
    );
    expect(screen.getByTestId("project-drawer-skeleton-meta-copy")).toHaveClass(
      "gap-0.5",
    );
  });
});
