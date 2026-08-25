import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { OrganizationManagementShell } from "@/features/organization/components/organization-management-shell";

const back = vi.fn();
vi.mock("@/features/organization/hooks/use-organization-back", () => ({
  useOrganizationBack: () => back,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    className,
    "aria-current": ariaCurrent,
  }: {
    to: string;
    children: ReactNode;
    className?: string;
    "aria-current"?: "page";
  }) => (
    <a href={to} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/organization/members" }),
}));

describe("OrganizationManagementShell", () => {
  it("renders the management header and local navigation", () => {
    render(
      <OrganizationManagementShell>
        <div>page content</div>
      </OrganizationManagementShell>,
    );

    expect(screen.getByText("Manage Organization")).toBeVisible();
    expect(
      screen.getByText("Manage Organization").parentElement?.parentElement,
    ).toHaveClass("bg-surface-basic", "w-84");
    expect(screen.getByRole("link", { name: "Organization" })).toHaveAttribute(
      "href",
      "/organization/members",
    );
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/organization/projects",
    );
  });

  it("aligns the desktop sidebar with the primary Nav", () => {
    render(
      <OrganizationManagementShell>
        <div>page content</div>
      </OrganizationManagementShell>,
    );

    const nav = screen.getByRole("navigation", {
      name: /^Organization management$/,
    });
    expect(nav.parentElement?.parentElement).toHaveClass("w-84");
    expect(nav.parentElement).not.toHaveClass("bg-surface-sunken");
    expect(nav.parentElement?.parentElement).toHaveClass("bg-surface-basic");

    const organizationLink = within(nav).getByRole("link", {
      name: "Organization",
    });
    expect(organizationLink).toHaveClass(
      "h-9",
      "gap-2",
      "rounded-lg",
      "px-2",
      "text-sm",
      "font-medium",
      "text-foreground-secondary",
      "hover:bg-surface-muted",
      "hover:text-foreground-primary",
    );
    expect(organizationLink).toHaveClass(
      "bg-surface-muted",
      "text-foreground-emphasis",
    );
    expect(within(nav).getByRole("link", { name: "Projects" })).not.toHaveClass(
      "bg-surface-muted",
    );
  });

  it("clips the outlet so feature cards own scrolling", () => {
    render(
      <OrganizationManagementShell>
        <div>page content</div>
      </OrganizationManagementShell>,
    );

    expect(screen.getByText("page content").parentElement).toHaveClass(
      "min-h-0",
      "min-w-0",
      "flex-1",
      "overflow-hidden",
    );
    expect(screen.getByText("page content").parentElement).not.toHaveClass(
      "overflow-auto",
    );
  });

  it("returns to the previous page from the back control", async () => {
    const user = userEvent.setup();
    render(
      <OrganizationManagementShell>
        <div>page content</div>
      </OrganizationManagementShell>,
    );

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(back).toHaveBeenCalledTimes(1);
  });
});
