import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useBoundOrganizationSuspenseQuery = vi.fn();
const usePermissionSnapshotSuspenseQuery = vi.fn();
const useStudioAgentsSuspenseQuery = vi.fn();

vi.mock("jotai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("jotai")>()),
  useAtomValue: () => null,
}));

vi.mock("@/hooks/use-bound-organization", () => ({
  useBoundOrganizationSuspenseQuery,
}));

vi.mock("@/features/rbac/hooks/use-permission-snapshot", () => ({
  usePermissionSnapshotSuspenseQuery,
}));

vi.mock("@/features/studio/hooks/use-studio-agents-query", () => ({
  useStudioAgentsSuspenseQuery,
}));

const { StudioGrid } = await import("@/features/studio/components/studio-grid");

beforeEach(() => {
  useBoundOrganizationSuspenseQuery.mockReset().mockReturnValue({ data: null });
  usePermissionSnapshotSuspenseQuery.mockReset().mockReturnValue({
    data: {
      platformRoles: new Set(),
      organizationRoles: new Map(),
      projectRoles: new Map(),
      agentRoles: new Map(),
    },
  });
  useStudioAgentsSuspenseQuery.mockReset().mockReturnValue({
    data: { agents: [], total: 0, hasNext: false },
  });
});

describe("StudioGrid", () => {
  it("queries the platform scope for platform admin with Studio access", () => {
    useBoundOrganizationSuspenseQuery.mockReturnValue({ data: { id: 42 } });
    usePermissionSnapshotSuspenseQuery.mockReturnValue({
      data: {
        platformRoles: new Set(["platform_admin"]),
        organizationRoles: new Map(),
        projectRoles: new Map(),
        agentRoles: new Map(),
      },
    });

    render(<StudioGrid activeTab="all" />);

    expect(useStudioAgentsSuspenseQuery).toHaveBeenCalledWith({
      type: "platform",
    });
  });

  it("queries the bound organization scope for other users", () => {
    useBoundOrganizationSuspenseQuery.mockReturnValue({ data: { id: 42 } });

    render(<StudioGrid activeTab="all" />);

    expect(useStudioAgentsSuspenseQuery).toHaveBeenCalledWith({
      type: "organization",
      organizationId: 42,
    });
  });

  it("rejects a missing bound organization before querying Studio agents", () => {
    expect(() => render(<StudioGrid activeTab="all" />)).toThrow(
      "A bound organization is required",
    );
    expect(useStudioAgentsSuspenseQuery).not.toHaveBeenCalled();
  });
});
