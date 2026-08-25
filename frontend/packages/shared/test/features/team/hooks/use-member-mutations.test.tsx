import {
  QueryClient,
  QueryClientProvider,
  type UseMutationResult,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { createStore, Provider } from "jotai";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { userAtom } from "@/atoms/auth-atom";
import { membershipKeys } from "@/features/membership";
import * as membersService from "@/features/membership";
import { projectKeys } from "@/features/projects/query-keys";
import { rbacKeys } from "@/features/rbac/query-keys";
import type { ProjectRoleCode } from "@/features/rbac/schemas/user-role";
import { useInviteMemberByEmailMutation } from "@/features/team";
import { useChangeRoleMutation } from "@/features/team/hooks/use-change-role-mutation";
import { useRemoveMemberMutation } from "@/features/team/hooks/use-remove-member-mutation";
import { ApiClientProvider } from "@/services/api-client-context";

vi.mock("@/features/membership", async (importActual) => {
  const actual = await importActual<typeof import("@/features/membership")>();
  return {
    ...actual,
    inviteProjectMember: vi.fn(),
    changeProjectMemberRole: vi.fn(),
    removeProjectMember: vi.fn(),
  };
});

function makeWrapper(currentUserId = 3): {
  Wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const apiClient = axios.create();
  const store = createStore();
  store.set(userAtom, {
    id: currentUserId,
    email: `user-${String(currentUserId)}@example.com`,
    roles: [],
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { Wrapper, queryClient };
}

beforeEach(() => {
  vi.mocked(membersService.inviteProjectMember)
    .mockReset()
    .mockResolvedValue(7);
  vi.mocked(membersService.changeProjectMemberRole)
    .mockReset()
    .mockResolvedValue(undefined);
  vi.mocked(membersService.removeProjectMember)
    .mockReset()
    .mockResolvedValue(undefined);
});

type InviteMemberByEmailInput = {
  email: string;
  roleCode: ProjectRoleCode;
};

describe("useInviteMemberByEmailMutation", () => {
  it("exposes the email-based public signature", () => {
    expectTypeOf(useInviteMemberByEmailMutation).toEqualTypeOf<
      (
        projectId: number,
      ) => UseMutationResult<number, Error, InviteMemberByEmailInput>
    >();
  });

  it("forwards domain invite input to the Team service", async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useInviteMemberByEmailMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      email: "person@example.com",
      roleCode: "project_admin",
    });

    expect(membersService.inviteProjectMember).toHaveBeenCalledWith(
      expect.anything(),
      7,
      { email: "person@example.com", roleCode: "project_admin" },
    );
  });

  it("does not invalidate when the user is not found", async () => {
    vi.mocked(membersService.inviteProjectMember).mockRejectedValue(
      new membersService.ProjectUserNotFoundError(),
    );
    const { Wrapper, queryClient } = makeWrapper(3);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useInviteMemberByEmailMutation(7), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        email: "user-3@example.com",
        roleCode: "project_member",
      }),
    ).rejects.toBeInstanceOf(membersService.ProjectUserNotFoundError);

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does not invalidate when user lookup fails", async () => {
    vi.mocked(membersService.inviteProjectMember).mockRejectedValue(
      new Error("lookup failed"),
    );
    const { Wrapper, queryClient } = makeWrapper(3);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useInviteMemberByEmailMutation(7), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        email: "user-3@example.com",
        roleCode: "project_member",
      }),
    ).rejects.toThrow("lookup failed");

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("invalidates another invited user's access without the self project list", async () => {
    const { Wrapper, queryClient } = makeWrapper(3);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useInviteMemberByEmailMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      email: "other@example.com",
      roleCode: "project_member",
    });

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: rbacKeys.userRoles(7),
        exact: true,
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: membershipKeys.project(7),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: projectKeys.detail(7),
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: projectKeys.lists(),
      exact: false,
    });
  });

  it("invalidates the self project list when inviting the current user", async () => {
    vi.mocked(membersService.inviteProjectMember).mockResolvedValue(3);
    const { Wrapper, queryClient } = makeWrapper(3);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useInviteMemberByEmailMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      email: "user-3@example.com",
      roleCode: "project_member",
    });

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: projectKeys.lists(),
        exact: false,
      }),
    );
  });

  it("reconciles exact target access when the base grant fails", async () => {
    vi.mocked(membersService.inviteProjectMember).mockRejectedValue(
      new membersService.ProjectMemberInviteError(7, new Error("base failed")),
    );
    const { Wrapper, queryClient } = makeWrapper(3);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useInviteMemberByEmailMutation(7), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        email: "other@example.com",
        roleCode: "project_admin",
      }),
    ).rejects.toThrow("base failed");

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: rbacKeys.userRoles(7),
        exact: true,
      }),
    );
  });

  it("reconciles self access when an admin overlay grant fails", async () => {
    vi.mocked(membersService.inviteProjectMember).mockRejectedValue(
      new membersService.ProjectMemberInviteError(
        3,
        new Error("overlay failed"),
      ),
    );
    const { Wrapper, queryClient } = makeWrapper(3);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useInviteMemberByEmailMutation(7), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        email: "unrelated@example.com",
        roleCode: "project_admin",
      }),
    ).rejects.toThrow("overlay failed");

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: rbacKeys.userRoles(3),
        exact: true,
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: membershipKeys.project(7),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: projectKeys.detail(7),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: projectKeys.lists(),
      exact: false,
    });
  });

  it("reconciles another user's access when an admin overlay grant fails", async () => {
    vi.mocked(membersService.inviteProjectMember).mockRejectedValue(
      new membersService.ProjectMemberInviteError(
        7,
        new Error("overlay failed"),
      ),
    );
    const { Wrapper, queryClient } = makeWrapper(3);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useInviteMemberByEmailMutation(7), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        email: "other@example.com",
        roleCode: "project_admin",
      }),
    ).rejects.toThrow("overlay failed");

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: rbacKeys.userRoles(7),
        exact: true,
      }),
    );
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: projectKeys.lists(),
      exact: false,
    });
  });
});

describe("useChangeRoleMutation", () => {
  it("forwards the role change to the Team service", async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useChangeRoleMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 3,
      toRoleCode: "project_admin",
    });

    expect(membersService.changeProjectMemberRole).toHaveBeenCalledWith(
      expect.anything(),
      7,
      { userId: 3, toRoleCode: "project_admin" },
    );
  });

  it("optimistically flips the member's role in the cache", async () => {
    const { Wrapper, queryClient } = makeWrapper();
    queryClient.setQueryData(membershipKeys.project(7), [
      { id: 3, email: "a@x.com", roleCode: "project_member" },
    ]);
    const { result } = renderHook(() => useChangeRoleMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 3,
      toRoleCode: "project_admin",
    });

    expect(queryClient.getQueryData(membershipKeys.project(7))).toEqual([
      { id: 3, email: "a@x.com", roleCode: "project_admin" },
    ]);
  });

  it("rolls the cache back when the Team service fails", async () => {
    vi.mocked(membersService.changeProjectMemberRole).mockRejectedValue(
      new Error("nope"),
    );
    const { Wrapper, queryClient } = makeWrapper();
    const before = [{ id: 3, email: "a@x.com", roleCode: "project_member" }];
    queryClient.setQueryData(membershipKeys.project(7), before);
    const { result } = renderHook(() => useChangeRoleMutation(7), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({ userId: 3, toRoleCode: "project_admin" }),
    ).rejects.toThrow("nope");

    expect(queryClient.getQueryData(membershipKeys.project(7))).toEqual(before);
  });

  it("invalidates another user's exact RBAC key without the current project list", async () => {
    const { Wrapper, queryClient } = makeWrapper(1);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useChangeRoleMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 3,
      toRoleCode: "project_admin",
    });

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: rbacKeys.userRoles(3),
        exact: true,
      }),
    );
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: projectKeys.lists(),
      exact: false,
    });
  });

  it("clears self roles and invalidates the self project list", async () => {
    const { Wrapper, queryClient } = makeWrapper(3);
    queryClient.setQueryData(rbacKeys.userRoles(3), [
      {
        userId: 3,
        roleCode: "project_member",
        scopeType: "project",
        scopeId: 7,
      },
    ]);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useChangeRoleMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 3,
      toRoleCode: "project_admin",
    });

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: projectKeys.lists(),
        exact: false,
      }),
    );
    expect(queryClient.getQueryData(rbacKeys.userRoles(3))).toEqual([]);
  });
});

describe("useRemoveMemberMutation", () => {
  it("forwards the removal to the Team service", async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRemoveMemberMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 3,
      roleCode: "project_admin",
    });

    expect(membersService.removeProjectMember).toHaveBeenCalledWith(
      expect.anything(),
      7,
      { userId: 3, roleCode: "project_admin" },
    );
  });

  it("invalidates another user's access without the self project list", async () => {
    const { Wrapper, queryClient } = makeWrapper(1);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRemoveMemberMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 3,
      roleCode: "project_member",
    });

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: rbacKeys.userRoles(3),
        exact: true,
      }),
    );
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: projectKeys.lists(),
      exact: false,
    });
  });

  it("clears self roles and invalidates the self project list", async () => {
    const { Wrapper, queryClient } = makeWrapper(3);
    queryClient.setQueryData(rbacKeys.userRoles(3), [
      {
        userId: 3,
        roleCode: "project_admin",
        scopeType: "project",
        scopeId: 7,
      },
    ]);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRemoveMemberMutation(7), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      userId: 3,
      roleCode: "project_admin",
    });

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: projectKeys.lists(),
        exact: false,
      }),
    );
    expect(queryClient.getQueryData(rbacKeys.userRoles(3))).toEqual([]);
  });

  it("reconciles access when removing the member base fails", async () => {
    vi.mocked(membersService.removeProjectMember).mockRejectedValue(
      new Error("base failed"),
    );
    const { Wrapper, queryClient } = makeWrapper(3);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRemoveMemberMutation(7), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.mutateAsync({
        userId: 3,
        roleCode: "project_admin",
      }),
    ).rejects.toThrow("base failed");

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: rbacKeys.userRoles(3),
        exact: true,
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: membershipKeys.project(7),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: projectKeys.detail(7),
    });
  });
});
