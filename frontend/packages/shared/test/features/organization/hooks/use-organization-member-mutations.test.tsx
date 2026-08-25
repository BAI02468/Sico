import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { createStore, Provider as JotaiProvider } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { userAtom } from "@/atoms/auth-atom";
import { membershipKeys } from "@/features/membership";
import * as membersService from "@/features/membership/services/organization-membership";
import { useChangeOrganizationRole } from "@/features/organization/hooks/use-change-organization-role";
import { useInviteOrganizationMember } from "@/features/organization/hooks/use-invite-organization-member";
import { useRemoveOrganizationMember } from "@/features/organization/hooks/use-remove-organization-member";
import { organizationKeys } from "@/features/organization/query-keys";
import { rbacKeys } from "@/features/rbac/query-keys";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock(
  "@/features/membership/services/organization-membership",
  async (importActual) => {
    const actual =
      await importActual<
        typeof import("@/features/membership/services/organization-membership")
      >();
    return {
      ...actual,
      inviteOrganizationMember: vi.fn(),
      changeOrganizationMemberRole: vi.fn(),
      removeOrganizationMember: vi.fn(),
    };
  },
);

function makeWrapper(currentUserId = 1): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const apiClient = axios.create();
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const store = createStore();
  store.set(userAtom, {
    id: currentUserId,
    email: `user-${String(currentUserId)}@example.com`,
    roles: [],
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <JotaiProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </JotaiProvider>
    );
  }

  return { Wrapper, queryClient };
}

beforeEach(() => {
  vi.mocked(membersService.inviteOrganizationMember)
    .mockReset()
    .mockResolvedValue(undefined);
  vi.mocked(membersService.changeOrganizationMemberRole)
    .mockReset()
    .mockResolvedValue(undefined);
  vi.mocked(membersService.removeOrganizationMember)
    .mockReset()
    .mockResolvedValue(undefined);
});

describe("organization member mutations", () => {
  it("invites an existing user and invalidates members", async () => {
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useInviteOrganizationMember(9), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      email: "person@example.com",
      role: "developer",
    });

    expect(membersService.inviteOrganizationMember).toHaveBeenCalledWith(
      expect.anything(),
      9,
      "person@example.com",
      "developer",
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: membershipKeys.organization(9),
        exact: true,
      }),
    );
  });

  it("invalidates members when a partial invite fails", async () => {
    vi.mocked(membersService.inviteOrganizationMember).mockRejectedValue(
      new Error("overlay failed"),
    );
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useInviteOrganizationMember(9), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        email: "person@example.com",
        role: "developer",
      }),
    ).rejects.toThrow("overlay failed");
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: membershipKeys.organization(9),
        exact: true,
      }),
    );
  });

  it.each([
    ["org_member", ["org_member"]],
    ["developer", ["org_member", "developer"]],
    ["org_admin", ["org_member", "org_admin"]],
  ] as const)(
    "optimistically projects %s grants",
    async (toRole, roleCodes) => {
      const { Wrapper, queryClient } = makeWrapper();
      queryClient.setQueryData(membershipKeys.organization(9), [
        {
          id: 7,
          email: "dev@example.com",
          role: "developer",
          roleCodes: ["org_member", "developer"],
        },
      ]);
      const { result } = renderHook(() => useChangeOrganizationRole(9), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({
        userId: 7,
        roleCodes: ["org_member", "developer"],
        toRole,
      });

      expect(queryClient.getQueryData(membershipKeys.organization(9))).toEqual([
        {
          id: 7,
          email: "dev@example.com",
          role: toRole,
          roleCodes,
        },
      ]);
    },
  );

  it("restores the complete grant snapshot after a failed role change", async () => {
    vi.mocked(membersService.changeOrganizationMemberRole).mockRejectedValue(
      new Error("forbidden"),
    );
    const { Wrapper, queryClient } = makeWrapper();
    const previousMember = {
      id: 7,
      email: "dev@example.com",
      role: "org_admin" as const,
      roleCodes: ["org_member", "developer", "org_admin"] as const,
    };
    const before = [previousMember];
    queryClient.setQueryData(membershipKeys.organization(9), before);
    const { result } = renderHook(() => useChangeOrganizationRole(9), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        userId: 7,
        roleCodes: previousMember.roleCodes,
        toRole: "developer",
      }),
    ).rejects.toThrow("forbidden");
    expect(queryClient.getQueryData(membershipKeys.organization(9))).toEqual(
      before,
    );
  });

  it("forwards all known grants when removing a member", async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveOrganizationMember(9), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 7,
      roleCodes: ["org_member", "developer"],
    });

    expect(membersService.removeOrganizationMember).toHaveBeenCalledWith(
      expect.anything(),
      9,
      { userId: 7, roleCodes: ["org_member", "developer"] },
    );
  });

  it.each(["change", "remove"] as const)(
    "%s on another user invalidates only members",
    async (operation) => {
      const { Wrapper, queryClient } = makeWrapper(1);
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      const { result: change } = renderHook(
        () => useChangeOrganizationRole(9),
        { wrapper: Wrapper },
      );
      const { result: remove } = renderHook(
        () => useRemoveOrganizationMember(9),
        { wrapper: Wrapper },
      );

      if (operation === "change") {
        await change.current.mutateAsync({
          userId: 7,
          roleCodes: ["org_member"],
          toRole: "developer",
        });
      } else {
        await remove.current.mutateAsync({
          userId: 7,
          roleCodes: ["org_member"],
        });
      }

      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: membershipKeys.organization(9),
        exact: true,
      });
    },
  );

  it("clears current-user roles before a self role change resolves", async () => {
    let resolveChange = (): void => {};
    vi.mocked(membersService.changeOrganizationMemberRole).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveChange = resolve;
      }),
    );
    const { Wrapper, queryClient } = makeWrapper(7);
    queryClient.setQueryData(rbacKeys.userRoles(7), [
      { userId: 7, roleCode: "org_admin", scopeType: "org", scopeId: 9 },
    ]);
    const { result } = renderHook(() => useChangeOrganizationRole(9), {
      wrapper: Wrapper,
    });

    const mutation = result.current.mutateAsync({
      userId: 7,
      roleCodes: ["org_member", "org_admin"],
      toRole: "developer",
    });

    await waitFor(() =>
      expect(queryClient.getQueryData(rbacKeys.userRoles(7))).toEqual([]),
    );
    resolveChange();
    await mutation;
  });

  it("keeps self roles cleared when an in-flight roles query settles", async () => {
    let resolveRoles = (): void => {};
    const staleRoles = [
      { userId: 7, roleCode: "org_admin", scopeType: "org", scopeId: 9 },
    ];
    const rolesResponse = new Promise<typeof staleRoles>((resolve) => {
      resolveRoles = () => resolve(staleRoles);
    });
    let resolveChange = (): void => {};
    vi.mocked(membersService.changeOrganizationMemberRole).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveChange = resolve;
      }),
    );
    const { Wrapper, queryClient } = makeWrapper(7);
    const rolesKey = rbacKeys.userRoles(7);
    queryClient.setQueryData(rolesKey, staleRoles);
    const rolesQuery = queryClient.fetchQuery({
      queryKey: rolesKey,
      queryFn: () => rolesResponse,
    });
    await waitFor(() =>
      expect(queryClient.getQueryState(rolesKey)?.fetchStatus).toBe("fetching"),
    );
    const cancelQueries = vi.spyOn(queryClient, "cancelQueries");
    const { result } = renderHook(() => useChangeOrganizationRole(9), {
      wrapper: Wrapper,
    });

    const mutation = result.current.mutateAsync({
      userId: 7,
      roleCodes: ["org_member", "org_admin"],
      toRole: "developer",
    });

    await waitFor(() =>
      expect(membersService.changeOrganizationMemberRole).toHaveBeenCalled(),
    );
    expect(cancelQueries).toHaveBeenCalledWith({
      queryKey: rolesKey,
      exact: true,
    });
    resolveRoles();
    await rolesQuery;
    expect(queryClient.getQueryData(rolesKey)).toEqual([]);
    resolveChange();
    await mutation;
  });

  it("does not clear current-user roles for another user's role change", async () => {
    let resolveChange = (): void => {};
    vi.mocked(membersService.changeOrganizationMemberRole).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveChange = resolve;
      }),
    );
    const { Wrapper, queryClient } = makeWrapper(7);
    const roles = [
      { userId: 7, roleCode: "org_admin", scopeType: "org", scopeId: 9 },
    ];
    queryClient.setQueryData(rbacKeys.userRoles(7), roles);
    const { result } = renderHook(() => useChangeOrganizationRole(9), {
      wrapper: Wrapper,
    });

    const mutation = result.current.mutateAsync({
      userId: 8,
      roleCodes: ["org_member"],
      toRole: "developer",
    });

    await waitFor(() =>
      expect(membersService.changeOrganizationMemberRole).toHaveBeenCalled(),
    );
    expect(queryClient.getQueryData(rbacKeys.userRoles(7))).toEqual(roles);
    resolveChange();
    await mutation;
  });

  it("does not restore current-user roles after a failed self role change", async () => {
    vi.mocked(membersService.changeOrganizationMemberRole).mockRejectedValue(
      new Error("forbidden"),
    );
    const { Wrapper, queryClient } = makeWrapper(7);
    queryClient.setQueryData(rbacKeys.userRoles(7), [
      { userId: 7, roleCode: "org_admin", scopeType: "org", scopeId: 9 },
    ]);
    const { result } = renderHook(() => useChangeOrganizationRole(9), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        userId: 7,
        roleCodes: ["org_member", "org_admin"],
        toRole: "developer",
      }),
    ).rejects.toThrow("forbidden");

    expect(queryClient.getQueryData(rbacKeys.userRoles(7))).toEqual([]);
  });

  it("a current-user role change clears roles but preserves bound membership", async () => {
    const { Wrapper, queryClient } = makeWrapper(7);
    const organizations = [{ id: 9, name: "SICO" }];
    queryClient.setQueryData(rbacKeys.userRoles(7), [
      { userId: 7, roleCode: "org_admin", scopeType: "org", scopeId: 9 },
    ]);
    queryClient.setQueryData(
      organizationKeys.userOrganizations(7),
      organizations,
    );
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useChangeOrganizationRole(9), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 7,
      roleCodes: ["org_member", "org_admin"],
      toRole: "developer",
    });

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
    expect(queryClient.getQueryData(rbacKeys.userRoles(7))).toEqual([]);
    expect(
      queryClient.getQueryData(organizationKeys.userOrganizations(7)),
    ).toEqual(organizations);
  });

  it("a successful current-user removal clears roles and bound membership", async () => {
    const { Wrapper, queryClient } = makeWrapper(7);
    queryClient.setQueryData(rbacKeys.userRoles(7), [
      { userId: 7, roleCode: "org_member", scopeType: "org", scopeId: 9 },
    ]);
    queryClient.setQueryData(organizationKeys.userOrganizations(7), [
      { id: 9, name: "SICO" },
    ]);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRemoveOrganizationMember(9), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 7,
      roleCodes: ["org_member"],
    });

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
    expect(queryClient.getQueryData(rbacKeys.userRoles(7))).toEqual([]);
    expect(
      queryClient.getQueryData(organizationKeys.userOrganizations(7)),
    ).toEqual([]);
  });

  it("a failed current-user removal preserves membership while reconciling access", async () => {
    vi.mocked(membersService.removeOrganizationMember).mockRejectedValue(
      new Error("remove failed"),
    );
    const { Wrapper, queryClient } = makeWrapper(7);
    const organizations = [{ id: 9, name: "SICO" }];
    queryClient.setQueryData(rbacKeys.userRoles(7), [
      { userId: 7, roleCode: "org_member", scopeType: "org", scopeId: 9 },
    ]);
    queryClient.setQueryData(
      organizationKeys.userOrganizations(7),
      organizations,
    );
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRemoveOrganizationMember(9), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        userId: 7,
        roleCodes: ["org_member"],
      }),
    ).rejects.toThrow("remove failed");

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
    expect(queryClient.getQueryData(rbacKeys.userRoles(7))).toEqual([]);
    expect(
      queryClient.getQueryData(organizationKeys.userOrganizations(7)),
    ).toEqual(organizations);
  });

  it("does not wait for access refetches before settling", async () => {
    const { Wrapper, queryClient } = makeWrapper(7);
    let finishInvalidation = (): void => {};
    const pendingInvalidation = new Promise<void>((resolve) => {
      finishInvalidation = resolve;
    });
    vi.spyOn(queryClient, "invalidateQueries").mockReturnValue(
      pendingInvalidation,
    );
    const { result } = renderHook(() => useRemoveOrganizationMember(9), {
      wrapper: Wrapper,
    });
    let settled = false;

    const mutation = result.current
      .mutateAsync({ userId: 7, roleCodes: ["org_member"] })
      .then(() => {
        settled = true;
      });

    await waitFor(() => expect(settled).toBe(true));
    finishInvalidation();
    await mutation;
  });
});
