import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userAtom } from "@/atoms/auth-atom";
import { type Device } from "@/features/devices/schemas/device";
import { OrganizationProjectsPageContent } from "@/features/organization/components/organization-projects-page-content";
import { type OrganizationSummary } from "@/features/organization/schemas/organization";
import { type OrganizationProject } from "@/features/projects/schemas/project";

const {
  manageDevicesMutate,
  mockUseInfiniteScrollSentinel,
  mockUseOrganizationDevicesQuery,
  mockUseOrganizationPermission,
  mockUseOrganizationProjectsQuery,
} = vi.hoisted(() => ({
  manageDevicesMutate: vi.fn(),
  mockUseInfiniteScrollSentinel: vi.fn(),
  mockUseOrganizationDevicesQuery: vi.fn(),
  mockUseOrganizationPermission: vi.fn(),
  mockUseOrganizationProjectsQuery: vi.fn(),
}));

vi.mock("@/hooks/use-infinite-scroll-sentinel", () => ({
  useInfiniteScrollSentinel: (...args: unknown[]) =>
    mockUseInfiniteScrollSentinel(...args),
}));
vi.mock("@/features/organization/hooks/use-manage-project-devices", () => ({
  useManageProjectDevices: () => ({
    mutate: manageDevicesMutate,
    isPending: false,
  }),
}));
vi.mock("@/features/devices/hooks/use-organization-devices-query", () => ({
  useOrganizationDevicesQuery: (...args: unknown[]) =>
    mockUseOrganizationDevicesQuery(...args),
}));
vi.mock(
  "@/features/organization/hooks/use-organization-projects-query",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/organization/hooks/use-organization-projects-query")
      >();
    return {
      ...actual,
      useOrganizationProjectsQuery: (...args: unknown[]) =>
        mockUseOrganizationProjectsQuery(...args),
    };
  },
);
vi.mock("@/features/rbac/hooks/use-organization-permission", () => ({
  useOrganizationPermission: () => mockUseOrganizationPermission(),
}));

const organization: OrganizationSummary = {
  id: 9,
  name: "SICO",
  description: "",
  createdAt: 1,
  updatedAt: 1,
  creatorUsername: "owner@example.com",
  roleCodes: ["org_admin"],
  isOwner: false,
};

const projects: OrganizationProject[] = [
  {
    id: 7,
    name: "Atlas",
    description: "",
    iconUrl: "",
    memberType: 0,
    agentInstances: [],
    ownerUsername: "owner@example.com",
    creatorUsername: "owner@example.com",
    organizationId: 9,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  },
];

function device(partial: Partial<Device>): Device {
  return {
    sandboxId: "sandbox",
    displayName: "Device",
    type: "emulator",
    status: "available",
    allocatable: true,
    organizationId: 9,
    projectId: 0,
    instanceId: "",
    instanceName: "",
    vncUrl: "",
    ...partial,
  };
}

const devices = [
  device({ sandboxId: "mobile-project", projectId: 7 }),
  device({ sandboxId: "mobile-free" }),
  device({ sandboxId: "windows-project", type: "physical", projectId: 7 }),
  device({ sandboxId: "windows-free", type: "wincua" }),
];

function renderProjects(
  overrides: Partial<{
    projectCount: number;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    fetchNextPage: () => void;
    canManage: boolean;
  }> = {},
): void {
  const store = createStore();
  store.set(userAtom, {
    id: 1,
    email: "admin@example.com",
    roles: [
      { id: 1, roleCode: "project_admin", scopeType: "project", scopeId: 7 },
    ],
  });
  mockUseOrganizationProjectsQuery.mockReturnValue({
    data: {
      pages: [
        {
          items: projects,
          total: overrides.projectCount ?? projects.length,
          hasNext: overrides.hasNextPage ?? false,
        },
      ],
      pageParams: [1],
    },
    hasNextPage: overrides.hasNextPage ?? false,
    isFetchingNextPage: overrides.isFetchingNextPage ?? false,
    isFetchNextPageError: overrides.isFetchNextPageError ?? false,
    fetchNextPage: overrides.fetchNextPage ?? vi.fn(),
  });
  mockUseOrganizationDevicesQuery.mockReturnValue({ data: devices });
  mockUseOrganizationPermission.mockReturnValue({
    canManageOrganizationDevices: overrides.canManage ?? true,
  });
  render(
    <Provider store={store}>
      <OrganizationProjectsPageContent organization={organization} />
    </Provider>,
  );
}

describe("OrganizationProjectsPageContent", () => {
  beforeEach(() => {
    mockUseInfiniteScrollSentinel.mockReset();
    mockUseOrganizationDevicesQuery.mockReset();
    mockUseOrganizationPermission.mockReset();
    mockUseOrganizationProjectsQuery.mockReset();
    manageDevicesMutate.mockReset();
  });
  it("renders project, Mobile, and Windows statistics", () => {
    renderProjects();

    expect(
      screen.getByRole("heading", { level: 1, name: "Projects" }),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Projects" })).toHaveTextContent(
      "Projects1 total",
    );
    expect(screen.getByRole("region", { name: "Mobiles" })).toHaveTextContent(
      "Mobiles1 Available2 total",
    );
    expect(screen.getByRole("region", { name: "Windows" })).toHaveTextContent(
      "Windows1 Available2 total",
    );
  });

  it("uses the backend total for project statistics", () => {
    renderProjects({ projectCount: 73 });
    expect(screen.getByRole("region", { name: "Projects" })).toHaveTextContent(
      "Projects73 total",
    );
  });

  it("uses the table card as the infinite-scroll root and appends skeleton rows", () => {
    renderProjects({ hasNextPage: true, isFetchingNextPage: true });

    expect(screen.getAllByTestId("project-loading-more-row")).toHaveLength(3);
    expect(screen.getByTestId("organization-projects-sentinel")).toBeVisible();
    const options = mockUseInfiniteScrollSentinel.mock.calls[0]?.[2];
    expect(options).toMatchObject({ fillOnComplete: true });
    const scrollRoot = screen.getByTestId("organization-projects-scroll-card");
    expect(options.rootRef.current).toBe(scrollRoot);
    expect(scrollRoot).toHaveClass("scrollbar", "h-full", "overflow-y-auto");
  });

  it("keeps loaded rows and retries after a next-page error", async () => {
    const fetchNextPage = vi.fn();
    const user = userEvent.setup();
    renderProjects({
      hasNextPage: true,
      isFetchNextPageError: true,
      fetchNextPage,
    });

    expect(screen.getByText("Atlas")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(fetchNextPage).toHaveBeenCalledOnce();
    expect(mockUseInfiniteScrollSentinel.mock.calls[0]?.[1]).toMatchObject({
      hasNextPage: false,
    });
  });

  it("renders owner and per-project device counts", () => {
    renderProjects();

    expect(screen.getByText("owner@example.com")).toBeVisible();
    expect(screen.getByText("Mobile 1")).toBeVisible();
    expect(screen.getByText("Windows 1")).toBeVisible();
  });

  it("uses the full content area and scrolls inside the table card", () => {
    renderProjects();

    const root = screen.getByRole("heading", {
      level: 1,
      name: "Projects",
    }).parentElement;
    expect(root).toHaveClass(
      "h-full",
      "min-h-0",
      "flex-1",
      "gap-3",
      "overflow-hidden",
      "w-full",
      "px-16",
      "pt-10",
      "pb-13",
    );
    expect(root).not.toHaveClass("max-w-6xl");

    const scroller = screen.getByRole("table").parentElement?.parentElement;
    expect(scroller).toHaveClass("scrollbar", "h-full", "overflow-y-auto");
    expect(scroller?.parentElement).toHaveClass(
      "mt-3",
      "min-h-0",
      "flex-1",
      "overflow-hidden",
    );
  });

  it("disables Manage Devices without organization management permission", async () => {
    const user = userEvent.setup();
    renderProjects({ canManage: false });

    await user.click(screen.getByRole("button", { name: "Project actions" }));

    expect(
      await screen.findByRole("menuitem", { name: "Manage Devices" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps Manage Devices open while saving and closes on success", async () => {
    const user = userEvent.setup();
    renderProjects();

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Manage Devices" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Manage Devices" });
    const increase = within(dialog)
      .getAllByRole("button", { name: "Increase" })
      .at(0);
    if (!increase) {
      throw new Error("Expected a device increase button");
    }
    await user.click(increase);
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(dialog).toBeVisible();
    const callbacks = manageDevicesMutate.mock.calls[0]?.[1];
    await act(async () => {
      await callbacks.onSuccess();
    });
    expect(
      screen.queryByRole("dialog", { name: "Manage Devices" }),
    ).not.toBeInTheDocument();
  });

  it("uses the Organization dialog width for Manage Devices", async () => {
    const user = userEvent.setup();
    renderProjects();

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Manage Devices" }),
    );

    expect(screen.getByRole("dialog", { name: "Manage Devices" })).toHaveClass(
      "w-130",
    );
  });

  it("opens Manage Devices from the project action menu", async () => {
    const user = userEvent.setup();
    renderProjects();

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Manage Devices" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Manage Devices" });
    expect(dialog).toBeVisible();
    expect(screen.getByRole("heading", { name: "Manage Devices" })).toHaveClass(
      "text-lg",
    );
    const mobileLabel = within(dialog).getByText("Mobiles");
    expect(mobileLabel).toHaveClass("text-base", "font-medium", "uppercase");
    expect(mobileLabel.parentElement?.parentElement).toHaveClass("h-10");
  });
});
