import { isRedirect } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Outlet: vi.fn(() => <div data-testid="organization-outlet" />),
  };
});

vi.mock("@sico/shared/features/organization/index.ts", () => ({
  OrganizationManagementShell: vi.fn(
    ({ children }: { children: ReactNode }) => (
      <div data-testid="organization-management-shell">{children}</div>
    ),
  ),
  OrganizationMembersPage: vi.fn(() => (
    <div data-testid="organization-members-page" />
  )),
  OrganizationProjectsPage: vi.fn(() => (
    <div data-testid="organization-projects-page" />
  )),
}));

function requireDefined<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`${label} is required`);
  }
  return value;
}

describe("organization routes", () => {
  let organizationRoute: typeof import("../../../src/routes/_authed/organization").Route;
  let organizationIndexRoute: typeof import("../../../src/routes/_authed/organization.index").Route;
  let membersRoute: typeof import("../../../src/routes/_authed/organization.members").Route;
  let projectsRoute: typeof import("../../../src/routes/_authed/organization.projects").Route;

  beforeAll(async () => {
    ({ Route: organizationRoute } =
      await import("../../../src/routes/_authed/organization"));
    ({ Route: organizationIndexRoute } =
      await import("../../../src/routes/_authed/organization.index"));
    ({ Route: membersRoute } =
      await import("../../../src/routes/_authed/organization.members"));
    ({ Route: projectsRoute } =
      await import("../../../src/routes/_authed/organization.projects"));
  });

  it("hides the primary sidebar on the parent route", () => {
    expect(organizationRoute.options.staticData?.hidePrimarySidebar).toBe(true);
  });

  it("mounts the organization management shell on the parent route", () => {
    const Component = requireDefined(
      organizationRoute.options.component,
      "organization parent route component",
    );

    render(<Component />);

    expect(
      screen.getByTestId("organization-management-shell"),
    ).toContainElement(screen.getByTestId("organization-outlet"));
  });

  it("mounts only the organization members page on the members route", () => {
    const Component = requireDefined(
      membersRoute.options.component,
      "organization members route component",
    );

    render(<Component />);

    screen.getByTestId("organization-members-page");
    expect(screen.queryByTestId("organization-projects-page")).toBeNull();
  });

  it("mounts only the organization projects page on the projects route", () => {
    const Component = requireDefined(
      projectsRoute.options.component,
      "organization projects route component",
    );

    render(<Component />);

    screen.getByTestId("organization-projects-page");
    expect(screen.queryByTestId("organization-members-page")).toBeNull();
  });

  it("keeps the members and projects route components distinct", () => {
    expect(membersRoute.options.component).not.toBe(
      projectsRoute.options.component,
    );
  });

  it.each([
    ["members", () => membersRoute],
    ["projects", () => projectsRoute],
  ])(
    "sets the %s document title to Manage Organization · SICO",
    (_name, route) => {
      const head = requireDefined(
        route().options.head,
        "organization route head",
      );

      expect(Reflect.apply(head, undefined, [])).toEqual({
        meta: [{ title: "Manage Organization · SICO" }],
      });
    },
  );

  it("redirects the organization index to the members route", () => {
    const beforeLoad = requireDefined(
      organizationIndexRoute.options.beforeLoad,
      "organization index beforeLoad",
    );
    let thrown: unknown;
    try {
      Reflect.apply(beforeLoad, undefined, []);
    } catch (error) {
      thrown = error;
    }

    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).toEqual(
      expect.objectContaining({
        options: expect.objectContaining({ to: "/organization/members" }),
      }),
    );
  });
});
